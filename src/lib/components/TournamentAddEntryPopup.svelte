<script lang="ts">
	import { modal } from "$lib/actions/modal";
	import {
		adminAddTeamRegistration,
		adminAddTournamentRegistration,
		listPlayers,
		listTeamsPage,
	} from "$lib/backend";
	import { errorMessage } from "$lib/dialogs";
	import { _ } from "$lib/i18n";

	// Admin "add a player / add a team to this tournament" picker. Both kinds fetch every
	// candidate once and filter client-side.
	let {
		open = $bindable(false),
		kind,
		tournament = undefined,
		excludeIds = [],
	}: {
		open?: boolean;
		kind: "player" | "team";
		tournament?: any;
		/** Player uids / team ids already registered. */
		excludeIds: string[];
	} = $props();

	type Entry = { id: string; label: string };

	let searchQuery = $state("");
	let selectedId = $state("");
	let status = $state("");
	let entries = $state<Entry[]>([]);

	let t = $derived(kind === "team" ? "tournamentAddTeamPopup" : "tournamentAddPlayerPopup");

	$effect(() => {
		if (!open) return;
		const load: Promise<Entry[]> =
			kind === "team"
				? listTeamsPage(null, 500).then((page) =>
						page.teams.map((team) => ({
							id: team.id,
							label: `${team.name} (${team.creator.name} + ${team.player2.name})`,
						})),
					)
				: listPlayers().then((players) => players.map((p) => ({ id: p.uid, label: p.name })));
		load
			.then((loaded) => (entries = loaded))
			.catch((error) => (status = errorMessage(error) ?? $_("common.unexpectedError")));
	});

	let available = $derived(
		entries.filter(
			(e) => !excludeIds.includes(e.id) && e.label.toLowerCase().includes(searchQuery.toLowerCase()),
		),
	);

	let isAdding = $state(false);
	async function handleAdd() {
		if (isAdding || !selectedId) return;

		isAdding = true;
		try {
			if (kind === "team") await adminAddTeamRegistration(tournament.id, selectedId);
			else await adminAddTournamentRegistration(tournament.id, selectedId);
			status = "";
			open = false;
		} catch (error) {
			status = errorMessage(error) ?? $_("common.unexpectedError");
		} finally {
			isAdding = false;
		}
	}
</script>

{#if open}
	<div class="popup">
		<div class="card add-entry-card" use:modal={() => (open = false)}>
			<div class="close-row">
				<button class="icon-btn" onclick={() => (open = false)} aria-label={$_("common.close")}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>

			<h2 class="popup-title">{$_(`${t}.title`)}</h2>

			<div class="form-group">
				<label for="add-entry-search">{$_(`${t}.searchLabel`)}</label>
				<span class="search-wrap">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="search-icon"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
					<input
						id="add-entry-search"
						type="search"
						class="search-input"
						placeholder={$_(`${t}.searchPlaceholder`)}
						bind:value={searchQuery}
					/>
				</span>
			</div>

			<div class="form-group">
				<label for="add-entry-select">{$_(kind === "team" ? `${t}.teamLabel` : `${t}.playerLabel`)}</label>
				<span class="select-wrap">
					<select id="add-entry-select" bind:value={selectedId}>
						<option value="">{$_(kind === "team" ? `${t}.selectTeamOption` : `${t}.selectPlayerOption`)}</option>
						{#each available as entry (entry.id)}
							<option value={entry.id}>{entry.label}</option>
						{/each}
					</select>
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="select-arrow"><polyline points="6 9 12 15 18 9"/></svg>
				</span>
			</div>

			{#if status}<p class="status error" role="alert">{status}</p>{/if}
			<button
				class="btn-common btn-play"
				class:btn-loading={isAdding}
				disabled={!selectedId}
				onclick={handleAdd}>{$_("common.add")}</button
			>
		</div>
	</div>
{/if}

<style>
	.add-entry-card {
		width: 420px;
		padding: 20px 26px 26px;
		gap: 14px;
	}
</style>
