<script lang="ts">
	import { onMount } from "svelte";
	import { getAuthSession } from "$lib/auth.svelte";
	import { setDiscordReturnPath } from "$lib/discord";
	import { _ } from "$lib/i18n";
	import { openLoginPopup } from "$lib/uiCommon";

	// Opened in a popup by the Anime Surfers game (surfers.playnesc.com), which can't sign in on its
	// own: the visitor signs in here, which sets the session cookie, and the game then fetches a game
	// token from /auth/game-token. The popup closes itself once signed in; the game retries when its
	// window gets focus back.
	const session = getAuthSession();
	let promptedLogin = false;

	onMount(() => {
		// A Discord login navigates this window away; come back here instead of the home page.
		setDiscordReturnPath("/game-login");
	});

	$effect(() => {
		if (!session.ready) return;
		if (session.user) {
			// Only works for a window the game opened; otherwise the text below says what to do.
			window.close();
		} else if (!promptedLogin) {
			promptedLogin = true;
			openLoginPopup();
		}
	});
</script>

<div class="card game-login">
	{#if session.user}
		<p>{$_("pageGameLogin.signedInAs", { values: { name: session.user.name } })}</p>
		<p>{$_("pageGameLogin.returnToGame")}</p>
	{:else if session.ready}
		<p>{$_("pageGameLogin.signInPrompt")}</p>
		<button class="btn-common" onclick={openLoginPopup}>{$_("pageGameLogin.signIn")}</button>
	{/if}
</div>

<style>
	.game-login {
		max-width: 420px;
		margin: 48px auto;
		align-items: center;
		text-align: center;
	}
</style>
