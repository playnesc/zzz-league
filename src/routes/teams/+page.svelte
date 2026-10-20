<script lang="ts">
	import { listTeamsPage } from "$lib/backend";
	import { _ } from "$lib/i18n";
	import SidePanel from "$lib/components/SidePanel.svelte";
	import TeamDetailsPopup from "$lib/components/TeamDetailsPopup.svelte";
	import TeamFormPopup from "$lib/components/TeamFormPopup.svelte";
	import TeamRow from "$lib/components/TeamRow.svelte";
	import type { Team, TeamCursor } from "$lib/types";
	import { onMount } from "svelte";

	const PAGE_SIZE = 18;

	// Keyset-only API (no offset/total count), so Prev/Next caches each fetched page plus the
	// cursor leading into it — same pager as HistoryList.svelte.
	let pageIndex = $state(0);
	let pageCache = $state<Team[][]>([]);
	let cursorForPage = $state<(TeamCursor | null)[]>([null]);
	let hasMoreAfterPage = $state<boolean[]>([]);
	let loading = $state(true);

	let teams = $derived(pageCache[pageIndex] ?? []);

	let detailsOpen = $state(false);
	let selectedTeam = $state<Team | null>(null);
	let formOpen = $state(false);
	let editingTeam = $state<Team | null>(null);
	let searchQuery = $state("");

	let filteredTeams = $derived(
		teams.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase())),
	);

	async function loadPage(index: number) {
		if (index < 0) return;
		if (pageCache[index]) {
			pageIndex = index;
			return;
		}

		loading = true;
		try {
			const page = await listTeamsPage(cursorForPage[index] ?? null, PAGE_SIZE);
			pageCache[index] = page.teams;
			hasMoreAfterPage[index] = page.hasMore;
			if (page.hasMore && page.teams.length) {
				const last = page.teams[page.teams.length - 1];
				cursorForPage[index + 1] = { createdAt: last.createdAt, id: last.id };
			}
			pageIndex = index;
		} finally {
			loading = false;
		}
	}

	onMount(() => loadPage(0));

	function openDetails(team: Team) {
		selectedTeam = team;
		detailsOpen = true;
	}

	function openEdit(team: Team) {
		detailsOpen = false;
		editingTeam = team;
		formOpen = true;
	}

	function handleSaved(updated: Team) {
		formOpen = false;
		pageCache = pageCache.map((page) => page.map((t) => (t.id === updated.id ? updated : t)));
	}

	// Cursors are (createdAt, id) boundaries, not row references, so they stay valid after a delete.
	function handleDeleted(teamId: string) {
		pageCache = pageCache.map((page) => page.filter((t) => t.id !== teamId));
	}
</script>

<div class="layout">
	<SidePanel></SidePanel>

	<div class="card main-content">
		<div class="page-header">
			<h2 class="page-title">{$_("pageTeams.title")}</h2>
			<span class="search-wrap">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="search-icon"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
				<input
					class="search-input"
					type="search"
					aria-label={$_("pageTeams.searchPlaceholder")}
					placeholder={$_("pageTeams.searchPlaceholder")}
					bind:value={searchQuery}
				/>
			</span>
		</div>

		{#if loading}
			<p class="notice">{$_("common.loading")}</p>
		{:else if teams.length === 0}
			<p class="notice">{$_("pageTeams.noTeams")}</p>
		{:else if filteredTeams.length === 0}
			<p class="notice">{$_("pageTeams.noResults")}</p>
		{:else}
			<div class="team-list">
				{#each filteredTeams as team (team.id)}
					<TeamRow {team} onclick={() => openDetails(team)} />
				{/each}
			</div>
		{/if}

		{#if pageIndex > 0 || hasMoreAfterPage[pageIndex]}
			<div class="pager">
				<button class="btn-common btn-sm" disabled={pageIndex === 0 || loading} onclick={() => loadPage(pageIndex - 1)}>
					<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
					{$_("pageTeams.previous")}
				</button>
				<span class="pager-label"
					>{$_("pageTeams.pageLabel", { values: { page: pageIndex + 1 } })}</span
				>
				<button class="btn-common btn-sm" disabled={!hasMoreAfterPage[pageIndex] || loading} onclick={() => loadPage(pageIndex + 1)}>
					{$_("pageTeams.next")}
					<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
				</button>
			</div>
		{/if}
	</div>
</div>

<TeamDetailsPopup bind:open={detailsOpen} team={selectedTeam} onEdit={openEdit} onDeleted={handleDeleted} />
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

	.search-wrap {
		position: relative;
		display: block;
		width: 160px;
	}

	@media (max-width: 640px) {
		.page-header {
			flex-wrap: wrap;
		}

		.search-wrap {
			width: 100%;
		}
	}

	.search-input {
		width: 100%;
		height: 32px;
		font-size: 12px;
		padding-left: 28px;
	}

	.team-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
	}

	.pager {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		padding: 16px 0 4px;
	}

	.pager-label {
		font-size: 12px;
		color: var(--text-muted);
		font-weight: 600;
	}
</style>
