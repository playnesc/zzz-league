<script lang="ts">
	import { resolve } from "$app/paths";
	import { _, locale, formatDate } from "$lib/i18n";
	import type { Tournament } from "$lib/types";
	import { STATUS_TONE, getTournamentStatus } from "$lib/tournamentState";
	import { dateDisplayOptions } from "$lib/uiCommon";
	import TierBadge from "$lib/components/TierBadge.svelte";

	let {
		tournament,
		now,
		compact = false,
	}: { tournament: Tournament; now: number; compact?: boolean } = $props();

	let status = $derived(getTournamentStatus(tournament, now));
	let tone = $derived(STATUS_TONE[status]);

	function date(ms: number) {
		return formatDate(new Date(ms), dateDisplayOptions, $locale);
	}

	let statusText = $derived.by(() => {
		switch (status) {
			case "upcoming":
				return $_("tournamentCard.registrationOpens", { values: { date: date(tournament.registrationStartDate) } });
			case "registration":
				return $_("tournamentCard.registrationUntil", { values: { date: date(tournament.registrationEndDate) } });
			case "registration_closed":
			case "bracket_created":
				return $_("tournamentCard.startsOn", { values: { date: date(tournament.tournamentStartDate) } });
			case "ongoing":
				return $_("tournamentCard.ongoing");
			case "complete":
				return $_("tournamentCard.ended");
		}
	});
</script>

<a
	class="tournament tone-border-{tone}"
	class:ended={status === "complete"}
	class:compact
	href={resolve(`/tournaments/${tournament.id}`)}
>
	<div class="tournament-row">
		<p class="tournament-name">{tournament.name}</p>
		<span class="meta-tag">{tournament.registrationType === "team" ? "2x2" : "1x1"}</span>
	</div>
	<div class="tournament-row">
		<p class="tournament-dates">
			{date(tournament.tournamentStartDate)} – {date(tournament.tournamentEndDate)}
		</p>
		<span class="meta-tag"
			>{tournament.gameMode === "deadly_assault" ? "Deadly Assault" : "Shiyu Defense"}</span
		>
	</div>
	<div class="tournament-row status-row">
		<p class="status-pill tone-{tone}">{statusText}</p>
		<span class="tier-tags">
			<TierBadge tier={tournament.minTier} max={tournament.maxTier} />
		</span>
	</div>
</a>

<style>
	.tournament {
		--accent: var(--border);
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
		font-size: 14px;
		text-align: left;
		padding: 14px 16px 14px 18px;
		background: var(--surface);
		border: 1px solid var(--border-soft);
		border-radius: var(--r-lg);
		border-left-width: 4px;
		border-left-style: solid;
		border-left-color: var(--accent);
		transition: border-color 0.15s ease;
	}

	.tournament:hover {
		border-color: var(--accent);
	}

	.tournament-row {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	.tournament-name {
		flex: 1;
		min-width: 0;
		font-size: 14px;
		font-weight: 700;
		color: var(--text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tournament-dates {
		flex: 1;
		min-width: 0;
		color: var(--text-muted);
		font-size: 12px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.meta-tag {
		flex-shrink: 0;
		margin-left: auto;
		padding: 3px 8px;
		border-radius: var(--r-sm);
		font-size: 10px;
		font-weight: 700;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		color: var(--text-muted);
		white-space: nowrap;
	}

	.tier-tags {
		flex-shrink: 0;
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.tournament.compact {
		background: var(--surface-2);
		border-radius: var(--r-md);
		border-left-width: 3px;
	}

	.tournament.tone-border-success {
		--accent: var(--success);
	}

	.tournament.tone-border-info {
		--accent: var(--info);
	}

	.tournament.tone-border-gold {
		--accent: var(--gold);
	}

	.tournament.tone-border-neutral {
		--accent: var(--border);
	}

	.status-row {
		flex-wrap: wrap;
		row-gap: 6px;
	}

	.tournament.ended {
		opacity: 0.6;
	}
</style>
