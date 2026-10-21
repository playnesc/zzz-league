<script lang="ts">
	import { tierInfo } from "$lib/uiCommon";

	// A single tier, or a min–max range when `max` differs from `tier`.
	let { tier, max }: { tier: number; max?: number } = $props();

	let first = $derived(tierInfo(tier));
	let last = $derived(max != null && max !== tier ? tierInfo(max) : undefined);
</script>

<span class="tier-range">
	{#if first}<span class="tier-badge {first.cls}">{first.name}</span>{/if}
	{#if last}
		<span class="tier-range-sep">–</span>
		<span class="tier-badge {last.cls}">{last.name}</span>
	{/if}
</span>

<style>
	.tier-range {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		flex-shrink: 0;
	}

	.tier-range-sep {
		color: var(--text-muted);
		font-size: var(--fs-xs);
	}
</style>
