import { json } from "@sveltejs/kit";
import { apiServerFetch } from "$lib/server/session";
import type { RequestHandler } from "./$types";

// Sites allowed to read a game token with the visitor's session cookie. They're subdomains of this
// site, so the browser sends the SameSite=Lax cookie on their credentialed fetches; CORS keeps any
// other origin from reading the response.
const GAME_ORIGINS = new Set(["https://surfers.playnesc.com"]);

// Called by the Anime Surfers game (fetch with credentials: "include"), which can't read the
// httpOnly session cookie itself: trades the session for a short-lived game token (see the API's
// GameTokenIssuer) that only works on the game's leaderboard endpoints. A plain GET with no custom
// headers, so the game's request needs no CORS preflight.
export const GET: RequestHandler = async ({ request, locals }) => {
	const origin = request.headers.get("origin");
	const headers: Record<string, string> = { "Cache-Control": "no-store", Vary: "Origin" };
	if (origin && GAME_ORIGINS.has(origin)) {
		headers["Access-Control-Allow-Origin"] = origin;
		headers["Access-Control-Allow-Credentials"] = "true";
	}

	if (!locals.sessionToken) return json({ error: "Not signed in" }, { status: 401, headers });

	let response: Response;
	try {
		response = await apiServerFetch("/api/auth/game-token", {
			method: "POST",
			headers: { Authorization: `Bearer ${locals.sessionToken}` },
		});
	} catch {
		return json({ error: "Auth service unavailable" }, { status: 502, headers });
	}

	// 401/404: the session expired or its player is gone — the game shows "sign in" either way.
	if (response.status === 401 || response.status === 404) {
		return json({ error: "Not signed in" }, { status: 401, headers });
	}
	if (!response.ok) {
		return json({ error: "Could not create a game token" }, { status: response.status === 429 ? 429 : 502, headers });
	}

	return json(await response.json(), { headers });
};
