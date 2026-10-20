<script lang="ts">
	import "../app.css";
	import { locale, migrateLegacyLocale } from "$lib/i18n";

	import {
		profileUser,
		settingsOpen,
		loginOpen,
		currentUser,
		role,
		viewingImage,
		refreshCurrentUser,
		refreshTournaments,
		refreshOneTournament,
	} from "$lib/store";

	import LoginPopup from "$lib/components/LoginPopup.svelte";
	import PlayerProfilePopup from "$lib/components/PlayerProfilePopup.svelte";
	import SettingsPopup from "$lib/components/SettingsPopup.svelte";
	import { onMount } from "svelte";
	import { page } from "$app/state";
	import { onAuthStateChanged } from "firebase/auth";
	import { auth } from "$lib/firebase";
	import { connectIfAuthenticated, disconnect, onTournamentChanged } from "$lib/signalr";
	import ImageViewerPopup from "$lib/components/ImageViewerPopup.svelte";
	import SiteHeader from "$lib/components/Header.svelte";
	import DialogHost from "$lib/components/DialogHost.svelte";
	import favicon from "$lib/assets/favicon.png";

	let { children, data } = $props();

	// Set synchronously before any child renders: on the server this makes the (shared, global)
	// svelte-i18n store match this request's locale for the whole render, and in the browser it
	// makes hydration render the same strings the server sent. Later switches go through setLocale.
	// svelte-ignore state_referenced_locally
	locale.set(data.locale);

	let profileOpen = $state(false);
	let imageViewerOpen = $state(false);

	$effect(() => {
		profileOpen = $profileUser !== null;
		imageViewerOpen = !!$viewingImage;
	});

	onMount(() => {
		migrateLegacyLocale();

		// The tournament list depends on the caller (hidden tournaments are only served to
		// moderators/admins), so it's (re)fetched on every auth state change — including the
		// initial one Firebase fires on load.
		const unsubAuth = onAuthStateChanged(auth, async (user) => {
			if (user) {
				await refreshCurrentUser(user.uid);
				refreshTournaments();
				await connectIfAuthenticated();
			} else {
				$currentUser = null;
				$role = "player";
				refreshTournaments();
				await disconnect();
			}
		});

		// Every client is auto-joined to the hub's list group (see TournamentHub), so this covers
		// the home page / tournament archive lists without a per-tournament subscription.
		const unsubTournamentChanged = onTournamentChanged((tournamentId) => {
			refreshOneTournament(tournamentId);
		});

		return () => {
			unsubAuth();
			unsubTournamentChanged();
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<!-- Owned here rather than per page: Svelte's SSR drops a page's <title> when that page
	     re-renders for bind: props. Pages name themselves via a `title` in their load data. -->
	<title>{page.data.title ? `${page.data.title} — NESC` : "NESC"}</title>
	<meta property="og:site_name" content="NESC" />
	<meta property="og:type" content="website" />
	<meta property="og:image" content={new URL(favicon, page.url.origin).href} />
</svelte:head>

<SiteHeader />

{@render children()}

{#if $loginOpen}<LoginPopup />{/if}
{#if $settingsOpen}<SettingsPopup />{/if}
{#if profileOpen}<PlayerProfilePopup player={$profileUser} />{/if}
{#if imageViewerOpen}<ImageViewerPopup src={$viewingImage} />{/if}
<DialogHost />
