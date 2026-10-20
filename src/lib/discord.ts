import { resolve } from "$app/paths"
import { auth, linkDiscord, loginWithDiscord } from "./firebase"
import type { Player } from "./types"

const DISCORD_CLIENT_ID = '1501228042926690486'

export type DiscordOAuthMode = 'login' | 'link';

export function openDiscordOAuth(mode: DiscordOAuthMode) {
	const redirectUri = `${window.location.origin}${resolve('/discord-callback')}`

	const params = new URLSearchParams({
		client_id: DISCORD_CLIENT_ID,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'identify',
		state: mode,
	})
	window.location.href = `https://discord.com/oauth2/authorize?${params}`
}

// Returns the updated Player when linking (for the caller to apply to its AuthSession); a login
// needs nothing applied — the root layout's onAuthStateChanged picks the new session up.
export async function handleDiscordCallback(): Promise<Player | undefined> {
	const params = new URLSearchParams(window.location.search);
	const code = params.get('code');
	if (!code) return;

	const redirectUri = `${window.location.origin}${resolve('/discord-callback')}`
	const mode = params.get('state') as DiscordOAuthMode | null;

	if (mode === 'login') {
		await loginWithDiscord(code, redirectUri);
	} else {
		await auth.authStateReady();
		return await linkDiscord(code, redirectUri);
	}
}