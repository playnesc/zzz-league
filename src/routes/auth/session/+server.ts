import { error, json } from "@sveltejs/kit";
import type { PlayerDto } from "$lib/api/dtos";
import { toPlayer } from "$lib/api/players";
import { apiServerFetch, deleteSessionCookie, setSessionCookie } from "$lib/server/session";
import type { RequestHandler } from "./$types";

interface CreateSessionResponse {
	token: string;
	expiresAt: string;
	player: PlayerDto;
}

// Called by AuthSession when the browser's Firebase session appears or needs renewing: trades the
// Firebase ID token for an API session token and keeps it in the httpOnly session cookie. Cross-site
// calls are blocked by the JSON body (needs a CORS preflight this server never answers) and
// SvelteKit's csrf.checkOrigin.
export const POST: RequestHandler = async ({ request, cookies }) => {
	const { idToken } = (await request.json().catch(() => ({}))) as { idToken?: unknown };
	if (typeof idToken !== "string" || !idToken) error(400, "idToken is required");

	let response: Response;
	try {
		response = await apiServerFetch("/api/auth/session", {
			method: "POST",
			headers: { Authorization: `Bearer ${idToken}` },
		});
	} catch {
		error(502, "Auth service unavailable");
	}

	if (!response.ok) {
		deleteSessionCookie(cookies);
		error(response.status === 401 || response.status === 404 ? response.status : 502, "Could not create session");
	}

	const session = (await response.json()) as CreateSessionResponse;
	setSessionCookie(cookies, session.token, new Date(session.expiresAt));
	return json(toPlayer(session.player));
};

export const DELETE: RequestHandler = ({ cookies }) => {
	deleteSessionCookie(cookies);
	return new Response(null, { status: 204 });
};
