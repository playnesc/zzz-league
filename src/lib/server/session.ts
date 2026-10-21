import type { Cookies } from "@sveltejs/kit";
import { API_BASE_URL } from "$lib/api";
import type { PlayerDto } from "$lib/api/dtos";
import { toPlayer } from "$lib/api/players";
import type { SessionData } from "$lib/auth.svelte";

// httpOnly mirror of the browser's Firebase session, holding an API-issued session token (see the
// API's SessionTokenIssuer). Only this server reads it — it's forwarded to the API as a Bearer
// token; the browser itself keeps talking to the API with Firebase ID tokens.
export const SESSION_COOKIE = "nesc_session";

const API_TIMEOUT_MS = 3000;
const RENEW_WITHIN_MS = 3 * 24 * 60 * 60 * 1000;

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: Date): void {
	cookies.set(SESSION_COOKIE, token, { path: "/", httpOnly: true, sameSite: "lax", expires: expiresAt });
}

export function deleteSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: "/" });
}

// Unverified read of the token's expiry, only to decide whether the browser should renew it —
// the API verifies the token itself on every use.
function expiresSoon(token: string): boolean {
	try {
		const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
		return payload.exp * 1000 - Date.now() < RENEW_WITHIN_MS;
	} catch {
		return true;
	}
}

// Node's global fetch, not a load's: SvelteKit applies browser CORS rules to the latter even on
// the server, and the API only allows the public site's origin.
export function apiServerFetch(path: string, init: RequestInit = {}): Promise<Response> {
	return fetch(`${API_BASE_URL}${path}`, { ...init, signal: AbortSignal.timeout(API_TIMEOUT_MS) });
}

// Resolves the session cookie into the root layout's SessionData. `ready: false` (the browser
// settles it, as before server sessions existed) only when the API couldn't be reached.
export async function resolveSession(token: string | null, cookies: Cookies): Promise<SessionData> {
	if (!token) return { user: null, ready: true };

	try {
		const response = await apiServerFetch("/api/players/me", {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (response.ok) {
			const user = toPlayer((await response.json()) as PlayerDto);
			return { user, ready: true, renew: expiresSoon(token) };
		}
		if (response.status === 401 || response.status === 404) {
			deleteSessionCookie(cookies);
			return { user: null, ready: true };
		}
	} catch {
		// Fall through: unreachable API or timeout.
	}
	return { user: null, ready: false };
}
