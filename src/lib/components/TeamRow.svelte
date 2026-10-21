<script lang="ts">
	import type { Team } from "$lib/types";
	import { bustCache } from "$lib/uiCommon";

	let { team, onclick }: { team: Team; onclick: () => void } = $props();

	function initials(name: string): string {
		const words = name.trim().split(/\s+/).filter(Boolean);
		if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
		return name.slice(0, 2).toUpperCase();
	}
</script>

<button type="button" class="team-row" {onclick}>
	{#if team.photoUrl}
		<img class="team-logo" src={bustCache(team.photoUrl)} alt="" />
	{:else}
		<span class="team-logo placeholder" aria-hidden="true">{initials(team.name)}</span>
	{/if}
	<span class="team-text">
		<span class="team-name">{team.name}</span>
		<span class="team-players">{team.creator.name} & {team.player2.name}</span>
	</span>
	<svg class="chevron" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
</button>

<style>
	.team-row {
		display: flex;
		align-items: center;
		gap: 11px;
		width: 100%;
		min-height: 40px;
		padding: 6px 12px;
		text-align: left;
		color: var(--text);
		font: inherit;
		background: var(--surface-2);
		border: 1px solid var(--border-soft);
		border-radius: var(--r-sm);
		cursor: pointer;
		transition: border-color 0.12s ease;
	}

	.team-row:hover {
		border-color: var(--gold-border);
	}

	.team-logo {
		width: 26px;
		height: 26px;
		object-fit: cover;
		border-radius: var(--r-sm);
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: var(--fs-xs);
	}

	.team-logo.placeholder {
		background: var(--surface-hover);
		color: var(--text-muted);
	}

	.team-text {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: baseline;
		gap: 11px;
	}

	.team-name {
		font-weight: 700;
		font-size: var(--fs-md);
		flex: 0 1 180px;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.team-players {
		flex: 1;
		color: var(--text-muted);
		font-size: var(--fs-md);
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chevron {
		color: var(--text-muted);
		flex-shrink: 0;
	}

	/* phones: name above players instead of two squeezed columns */
	@media (max-width: 640px) {
		.team-text {
			flex-direction: column;
			gap: 0;
		}

		.team-name {
			flex: none;
			max-width: 100%;
		}

		.team-players {
			font-size: var(--fs-sm);
			max-width: 100%;
		}
	}
</style>
