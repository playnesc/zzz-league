<script lang="ts">
	import { listMyTeams } from "$lib/backend";
	import { _ } from "$lib/i18n";
	import SidePanel from "$lib/components/SidePanel.svelte";
	import TeamDetailsPopup from "$lib/components/TeamDetailsPopup.svelte";
	import TeamFormPopup from "$lib/components/TeamFormPopup.svelte";
	import TeamRow from "$lib/components/TeamRow.svelte";
	import { currentUser, isAdmin } from "$lib/store";
	import type { Team } from "$lib/types";

	let teams = $state<Team[]>([]);
	let loading = $state(true);
	let formOpen = $state(false);
	let editingTeam = $state<Team | null>(null);
	let detailsOpen = $state(false);
	let selectedTeam = $state<Team | null>(null);

	async function load() {
		if (!$currentUser) {
			// On a full page reload, Firebase auth hasn't resolved yet on first render — this
			// isn't "logged out", it's "don't know yet". The $effect below re-runs load() once
			// $currentUser actually settles (to a user or to null), so this just clears the
			// spinner instead of leaving it stuck forever waiting for a retry that never comes.
			teams = [];
			loading = false;
			return;
		}
		loading = true;
		teams = await listMyTeams($currentUser.uid);
		loading = false;
	}

	$effect(() => {
		$currentUser;
		load();
	});

	function openCreate() {
		editingTeam = null;
		formOpen = true;
	}

	function openEdit(team: Team) {
		detailsOpen = false;
		editingTeam = team;
		formOpen = true;
	}

	function openDetails(team: Team) {
		selectedTeam = team;
		detailsOpen = true;
	}

	function handleSaved() {
		formOpen = false;
		load();
	}

	function handleDeleted() {
		load();
	}
</script>

<div class="layout">
	<SidePanel></SidePanel>

	<div class="card main-content">
		<div class="page-header">
			<h2 class="page-title">{$_("pageTeamsMine.title")}</h2>
			<button class="btn-common btn-play create-btn" onclick={openCreate}
				><svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> {$_("pageTeamsMine.createTeamButton")}</button
			>
		</div>

		{#if !$currentUser}
			<p class="notice">{$_("pageTeamsMine.loginPrompt")}</p>
		{:else if loading}
			<p class="notice">{$_("common.loading")}</p>
		{:else if teams.length === 0}
			<p class="notice">{$_("pageTeamsMine.noTeams")}</p>
		{:else}
			<div class="team-list">
				{#each teams as team (team.id)}
					<TeamRow {team} onclick={() => openDetails(team)} />
				{/each}
			</div>
		{/if}
	</div>
</div>

<TeamDetailsPopup
	bind:open={detailsOpen}
	team={selectedTeam}
	onEdit={openEdit}
	onDeleted={handleDeleted}
/>
<TeamFormPopup bind:open={formOpen} team={editingTeam} onSaved={handleSaved} />

<style>
	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--border-soft);
	}

	.page-title {
		font-size: 20px;
		border: none;
		padding: 0;
		margin: 0;
		min-height: 32px;
		display: flex;
		align-items: center;
	}

	.create-btn {
		width: auto;
		height: 32px;
		font-size: 12px;
		padding: 0 14px;
	}

	.team-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
	}

</style>
