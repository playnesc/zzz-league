<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import SidePanel from "$lib/components/SidePanel.svelte";
	import TournamentCard from "$lib/components/TournamentCard.svelte";
	import { _ } from "$lib/i18n";
	import { listTournamentsPage } from "$lib/backend";
	import { getLeagueData } from "$lib/leagueData.svelte";
	import type { Tournament } from "$lib/types";

	const PAGE_SIZE = 21;

	const league = getLeagueData();

	let now = $state(Date.now());

	// 1-based, read from ?page= so a page is linkable and survives back/forward. Anything
	// missing or unparseable reads as page 1.
	let currentPage = $derived(Math.max(1, Math.floor(Number(page.url.searchParams.get("page"))) || 1));

	let tournaments = $state.raw<Tournament[]>([]);
	let totalCount = $state(0);
	let loaded = $state(false);
	let loading = $state(false);
	let loadFailed = $state(false);
	let totalPages = $derived(Math.max(1, Math.ceil(totalCount / PAGE_SIZE)));

	// Bumped per request so a slow response for a page the viewer already left can't overwrite
	// the newer one.
	let requestId = 0;

	function pageHref(pageNumber: number): string {
		return pageNumber > 1 ? `${resolve("/tournaments")}?page=${pageNumber}` : resolve("/tournaments");
	}

	async function loadPage(pageNumber: number) {
		const id = ++requestId;
		loading = true;
		try {
			const result = await listTournamentsPage(pageNumber, PAGE_SIZE);
			if (id !== requestId) return;
			// A ?page= past the end (e.g. an old link after tournaments were deleted) → last real page.
			if (result.items.length === 0 && result.totalCount > 0) {
				await goto(pageHref(Math.ceil(result.totalCount / PAGE_SIZE)), { replaceState: true });
				return;
			}
			tournaments = result.items;
			totalCount = result.totalCount;
			loadFailed = false;
			loaded = true;
		} catch {
			if (id === requestId) loadFailed = true;
		} finally {
			if (id === requestId) loading = false;
		}
	}

	// Re-runs on page change, and whenever the layout's LeagueData list changes — that's exactly
	// when this page's slice may be stale: auth changes (hidden tournaments are moderator-only)
	// and SignalR TournamentChanged pushes both land there first.
	$effect(() => {
		void league.tournaments;
		loadPage(currentPage);
	});

	onMount(() => {
		const interval = setInterval(() => {
			now = Date.now();
		}, 1000);

		return () => {
			clearInterval(interval);
		};
	});
</script>

<div class="layout">
	<SidePanel></SidePanel>

	<div class="card main-content">
		<h2 class="archive-title">{$_("pageTournaments.title")}</h2>
		{#if tournaments.length > 0}
			<div class="archive-grid" class:is-loading={loading}>
				{#each tournaments as tournament (tournament.id)}
					<TournamentCard {tournament} {now} compact />
				{/each}
			</div>

			{#if totalPages > 1}
				<div class="pager">
					<button class="btn-common btn-sm" disabled={currentPage <= 1 || loading} onclick={() => goto(pageHref(currentPage - 1))}>
						<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
						{$_("pageTournaments.previous")}
					</button>
					<span class="pager-label"
						>{$_("pageTournaments.pageLabel", { values: { page: currentPage, total: totalPages } })}</span
					>
					<button class="btn-common btn-sm" disabled={currentPage >= totalPages || loading} onclick={() => goto(pageHref(currentPage + 1))}>
						{$_("pageTournaments.next")}
						<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
					</button>
				</div>
			{/if}
		{:else if loadFailed}
			<p class="empty-label">{$_("common.unexpectedError")}</p>
		{:else if !loaded}
			<p class="empty-label">{$_("common.loading")}</p>
		{:else}
			<p class="empty-label">{$_("pageTournaments.noTournaments")}</p>
		{/if}
	</div>
</div>

<style>
	.archive-title {
		font-size: 20px;
		padding-bottom: 16px;
		/* border-box min-height includes the padding-bottom/border below, so this is
		   32px (the shared control-row height) + 16px + 1px border, to match teams pages'
		   header row exactly */
		min-height: 49px;
		display: flex;
		align-items: center;
	}

	.archive-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 14px;
		transition: opacity 0.15s;
	}

	.archive-grid.is-loading {
		opacity: 0.6;
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

	.empty-label {
		color: var(--text-dim);
	}
</style>
