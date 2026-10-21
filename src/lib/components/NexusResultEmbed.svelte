<script lang="ts">
	import { _ } from "$lib/i18n";
	import { openNexusPopup } from "$lib/uiCommon";

	// expandable: clicking the overlay opens it large in a popup (like screenshots do).
	let { resultId, expandable = true }: { resultId: string; expandable?: boolean } = $props();

	// Nexus's /obs page is a fixed 1920×1080 stream overlay, so it's rendered at full size and
	// scaled down to the card width instead of relying on the page adapting to a small iframe.
	// Only the result panel is shown: at 1920×1080 it spans roughly x 138–1780, y 55–815, and the
	// rest is empty — except Nexus's cookie banner at y ~975–1060, which shows in every embed
	// (third-party frames don't see the viewer's consent) and can't be dismissed from here.
	// Measured 2026-10-20 on Shiyu + Deadly Assault results; re-measure if Nexus changes layout.
	const CROP = { x: 110, y: 30, width: 1700, height: 810 };
	let boxWidth = $state(0);
	let scale = $derived(boxWidth / CROP.width);
	let obsUrl = $derived(`https://nexus-shiyu.com/results/${encodeURIComponent(resultId)}/obs`);
</script>

<div class="nexus-embed" style:aspect-ratio="{CROP.width} / {CROP.height}" bind:clientWidth={boxWidth}>
	<iframe
		src={obsUrl}
		title={$_("tournamentMatchPopup.nexusResultTitle")}
		loading="lazy"
		referrerpolicy="no-referrer"
		tabindex="-1"
		style:transform="scale({scale}) translate(-{CROP.x}px, -{CROP.y}px)"
	></iframe>
	{#if expandable}
		<button
			type="button"
			class="expand-overlay"
			onclick={() => openNexusPopup(resultId)}
			aria-label={$_("tournamentMatchPopup.nexusExpand")}
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
		</button>
	{/if}
</div>
<a class="nexus-open-link" href={obsUrl} target="_blank" rel="noopener noreferrer"
	>{$_("tournamentMatchPopup.openOnNexus")}</a
>

<style>
	.nexus-embed {
		position: relative;
		width: 100%;
		overflow: hidden;
		border-radius: var(--r-md);
		background: var(--bg-elevated);
		border: 1px solid var(--border);
	}

	.nexus-embed iframe {
		position: absolute;
		top: 0;
		left: 0;
		width: 1920px;
		height: 1080px;
		border: 0;
		transform-origin: 0 0;
		pointer-events: none;
	}

	/* Covers the (non-interactive) iframe so the whole embed is one click target. */
	.expand-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: flex-start;
		justify-content: flex-end;
		padding: 6px;
		background: transparent;
		border: none;
		color: var(--text);
		cursor: zoom-in;
	}

	.expand-overlay svg {
		padding: 5px;
		box-sizing: content-box;
		border-radius: var(--r-sm, 6px);
		background: oklch(0.10 0.005 95 / 0.55);
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.expand-overlay:hover svg,
	.expand-overlay:focus-visible svg {
		opacity: 1;
	}

	@media (hover: none) {
		.expand-overlay svg {
			opacity: 1;
		}
	}

	.nexus-open-link {
		align-self: flex-end;
		font-size: 11px;
		color: var(--text-dim);
	}

	.nexus-open-link:hover {
		color: var(--gold);
	}
</style>
