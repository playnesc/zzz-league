<script lang="ts">
	import { approveRegistration } from "$lib/backend";
	import { getAuthSession } from "$lib/auth.svelte";
	import type { PlayerListItem, Team, Tournament, TournamentRegistration } from "$lib/types";
	import { hasTournamentStarted } from "$lib/tournamentState";
	import { getTier } from "$lib/uiCommon";
	import { _ } from "$lib/i18n";

	const session = getAuthSession();

	interface Props {
		registrations: TournamentRegistration[]; // team-shaped (teamId set) only
		teamsById: Map<string, Team>;
		playersData: PlayerListItem[];
		tournament?: Tournament;
		hideOptions: boolean;
		searchQuery: string;
		onViewTeam?: (teamId: string) => void;
		onViewRegistration?: (teamId: string) => void;
	}

	let {
		registrations = [],
		teamsById,
		playersData,
		hideOptions = false,
		searchQuery = "",
		tournament = undefined,
		onViewTeam = undefined,
		onViewRegistration = undefined,
	}: Props = $props();

	// Rows for a team whose members haven't loaded yet (or whose Team itself hasn't resolved into
	// teamsById yet) are dropped until they have.
	let rows = $derived(
		registrations.flatMap((registration) => {
			const team = registration.teamId ? teamsById.get(registration.teamId) : undefined;
			if (!team) return [];

			const p1 = playersData.find((p) => p.uid === team.creator.uid);
			const p2 = playersData.find((p) => p.uid === team.player2.uid);
			if (!p1 || !p2) return [];

			const tier1 = getTier(p1);
			const tier2 = getTier(p2);
			const label = `${team.name} (${team.creator.name} + ${team.player2.name})`;

			return [{ team, registration, tier1, tier2, label }];
		}),
	);

	let sortedRows = $derived(
		[...rows].sort(
			(a, b) => a.registration.registrationTimestamp - b.registration.registrationTimestamp,
		),
	);

	let filteredRows = $derived(
		sortedRows.filter((r) => !searchQuery || r.label.toLowerCase().includes(searchQuery.toLowerCase())),
	);

	async function handleApprove(registrationId: string, approved: boolean) {
		approveRegistration(tournament!.id, registrationId, !approved);
	}

	let canViewRegistrations = $derived(
		session.isAdmin || session.isModerator || hasTournamentStarted(tournament?.state),
	);
</script>

<table>
	<thead>
		<tr>
			<th>{$_("tournamentTeamTable.numberColumn")}</th>
			<th>{$_("tournamentTeamTable.tierColumn")}</th>
			<th>{$_("tournamentTeamTable.teamColumn")}</th>
			<th>{$_("tournamentTeamTable.confirmedColumn")}</th>
			{#if canViewRegistrations}<th>{$_("tournamentTeamTable.registrationColumn")}</th>{/if}
			{#if session.isAdmin && !hideOptions}<th>{$_("tournamentTeamTable.optionsColumn")}</th>{/if}
		</tr>
	</thead>
	<tbody>
		{#each filteredRows as row, index}
			<tr>
				<td>{index + 1}</td>
				<td class="tier-pair">
					<span class="tier-badge {row.tier1.cls}">{row.tier1.name}</span>
					<span class="tier-sep">+</span>
					<span class="tier-badge {row.tier2.cls}">{row.tier2.name}</span>
				</td>
				<td class="player-name">
					<button
						class="hover-emphasis team-name-btn"
						onclick={() => onViewTeam?.(row.team.id)}>{row.label}</button
					>
				</td>
				<td class="approved-cell {row.registration.approved ? 'approved' : 'declined'}">
					{#if row.registration.approved}
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
					{:else}
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					{/if}
				</td>
				{#if canViewRegistrations}
					<td>
						<button
							class="btn-common btn-view"
							onclick={() => onViewRegistration?.(row.team.id)}
							>{$_("tournamentTeamTable.viewButton")}</button
						>
					</td>
				{/if}
				{#if session.isAdmin && !hideOptions}
					<td class="options-cell">
						<button
							class="icon-btn"
							aria-label={row.registration.approved
								? $_("common.revokeApproval")
								: $_("common.approveRegistration")}
							title={row.registration.approved
								? $_("common.revokeApproval")
								: $_("common.approveRegistration")}
							onclick={() => handleApprove(row.registration.id, row.registration.approved)}
						>
							{#if row.registration.approved}<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>{:else}<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{/if}
						</button>
					</td>
				{/if}
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.approved-cell {
		text-align: center;
	}

	.approved-cell.approved {
		color: var(--success);
	}

	.approved-cell.declined {
		color: var(--danger);
	}

	.btn-view {
		height: 26px;
		padding: 0 10px;
		font-size: 11px;
	}

	.tier-pair {
		white-space: nowrap;
	}

	.tier-sep {
		color: var(--text-dim);
		font-weight: 700;
		margin: 0 2px;
	}

	.team-name-btn {
		display: inline-block;
		max-width: 260px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		vertical-align: bottom;
	}
</style>
