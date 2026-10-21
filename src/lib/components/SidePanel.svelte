<script lang="ts">
	import {
		openLoginPopup,
		openProfilePopup,
		openSettingsPopup,
	} from "$lib/uiCommon";

	import { getAgentAvatar } from "$lib/agentAvatars";
	import avatarPlaceholder from "$lib/assets/avatar-placeholder.webp";
	import { auth } from "$lib/firebase";
	import { signOut } from "firebase/auth";
	import AdminPanel from "./AdminPanel.svelte";
	import { getAuthSession } from "$lib/auth.svelte";
	import { resolve } from "$app/paths";
	import { _ } from "$lib/i18n";
	import { onMount } from "svelte";

	const session = getAuthSession();

	let avatar = $derived(getAgentAvatar(session.user?.avatar));

	// The rules are reference material: open beside the content on desktop, collapsed on phones
	// where the side panel stacks above the leaderboard. The server can't see the viewport, so it
	// renders them collapsed and desktop opens them after hydration — that only grows the side
	// column, whereas the reverse would collapse a long list above the content on phones.
	let rulesOpen = $state(false);
	onMount(() => {
		if (!window.matchMedia("(max-width: 800px)").matches) rulesOpen = true;
	});
</script>

<div class="side-panel">
	{#if !session.ready}
		<!-- Holds the login card's space until we know which card to show (see AuthSession.ready). -->
		<div class="card auth-pending" aria-hidden="true"></div>
	{:else if !session.user}
		<div class="card">
			<div class="btn-row">
				<button class="btn-common btn-play" onclick={openLoginPopup}
					>{$_("sidePanel.login")}</button
				>
			</div>
		</div>
	{:else}
		<div class="card">
			<button
				class="user-label"
				onclick={() => session.user && openProfilePopup(session.user)}
			>
				<span
					class="avatar-wrap"
					style="background-image: {avatar ? 'none' : `url(${avatarPlaceholder})`}"
				>
					{#if avatar}
						<img class="user-avatar" src={avatar.src} alt={avatar.name} />
					{/if}
				</span>
				<span class="user-name">{session.user.name}</span>
			</button>
			<div class="divider"></div>
			<div class="nav-list">
				<button class="nav-item" onclick={openSettingsPopup}>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
					{$_("sidePanel.settings")}
				</button>
				<a class="nav-item" href={resolve("/teams/mine")}>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
					{$_("sidePanel.myTeams")}
				</a>
				<a class="nav-item" href={resolve(`/history/${session.user.uid}`)}>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>
					{$_("sidePanel.myHistory")}
				</a>
			</div>
			<div class="divider"></div>
			<button class="nav-item nav-item-danger" onclick={() => signOut(auth)}>
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
				{$_("sidePanel.logout")}
			</button>
		</div>
	{/if}

	{#if !session.isAdmin}
		<details class="card rules-card" bind:open={rulesOpen}>
			<summary>
				<h2>
					<svg class="rules-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 5H4a1 1 0 0 0-1 1 5 5 0 0 0 4 4.9"/><path d="M17 5h3a1 1 0 0 1 1 1 5 5 0 0 1-4 4.9"/></svg>
					{$_("sidePanel.leagueCodeTitle")}
				</h2>
				<svg class="rules-chevron" aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
			</summary>
			<ul class="rules-list">
				<li>{@html $_("sidePanel.rules.ranks")}</li>
				<li>{@html $_("sidePanel.rules.qualification")}</li>
				<li>{@html $_("sidePanel.rules.levels")}</li>
				<li>{@html $_("sidePanel.rules.tournamentBonus")}</li>
				<li>{@html $_("sidePanel.rules.finalTournament")}</li>
				<li>{@html $_("sidePanel.rules.leagueReset")}</li>
				<li>{@html $_("sidePanel.rules.seasons")}</li>
				<li>{@html $_("sidePanel.rules.elimination")}</li>
				<li>{@html $_("sidePanel.rules.eloPoints")}</li>
				<li>{@html $_("sidePanel.rules.techLoss")}</li>
			</ul>
		</details>
	{/if}

	{#if session.isAdmin}
		<AdminPanel />
	{/if}
</div>

<style>
	.side-panel {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	/* Same height as the logged-out card (one button row), the more common first paint. */
	.auth-pending {
		min-height: 74px;
	}

	.user-label {
		display: flex;
		align-items: center;
		gap: 11px;
		width: 100%;
	}

	.user-name {
		flex: 1;
		font-weight: 700;
		font-size: 14px;
		line-height: 1.3;
		text-align: left;
	}

	.avatar-wrap {
		flex-shrink: 0;
		width: 42px;
		height: 42px;
		border-radius: 50%;
		border: 2px solid var(--border);
		background-size: cover;
		background-position: center;
		overflow: hidden;
	}

	.user-avatar {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.divider {
		height: 1px;
		background: var(--border-soft);
		margin: 14px 0;
	}

	.nav-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.nav-item {
		all: unset;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 12px;
		border-radius: var(--r-md);
		color: var(--text-muted);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: 0.15s;
	}

	.nav-item:hover {
		background: var(--surface-2);
		color: var(--text);
	}

	.nav-item-danger {
		color: var(--danger);
	}

	.rules-card summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		cursor: pointer;
		list-style: none;
		border-radius: var(--r-sm);
	}

	.rules-card summary::-webkit-details-marker {
		display: none;
	}

	.rules-card summary h2 {
		flex: 1;
		margin-bottom: 0;
	}

	.rules-card[open] summary {
		margin-bottom: 8px;
	}

	.rules-card:not([open]) summary h2 {
		border-bottom: none;
		padding-bottom: 0;
	}

	.rules-icon {
		color: var(--gold);
		flex-shrink: 0;
	}

	.rules-chevron {
		flex-shrink: 0;
		color: var(--text-muted);
		transition: transform 0.15s;
	}

	.rules-card[open] .rules-chevron {
		transform: rotate(180deg);
	}

	.rules-list {
		padding-left: 18px;
		margin: 0;
		font-size: 12px;
		line-height: 1.55;
		color: var(--text-muted);
	}

	.rules-list li {
		margin-bottom: 13px;
	}

	.rules-list li:last-child {
		margin-bottom: 0;
	}

	.rules-list li::marker {
		color: var(--gold);
	}

	.rules-list :global(b) {
		color: var(--text);
	}
</style>
