<script lang="ts">
	import { _ } from "$lib/i18n";

	let { resultId }: { resultId: string } = $props();

	// Nexus's /obs page is a fixed 1920×1080 stream overlay (transparent background), so it's
	// rendered at full size and scaled down to the card width instead of relying on the page
	// adapting to a small iframe.
	const OVERLAY_WIDTH = 1920;
	let boxWidth = $state(0);
	let scale = $derived(boxWidth / OVERLAY_WIDTH);
	let obsUrl = $derived(`https://nexus-shiyu.com/results/${encodeURIComponent(resultId)}/obs`);
</script>

<div class="nexus-embed" bind:clientWidth={boxWidth}>
	<iframe
		src={obsUrl}
		title={$_("tournamentMatchPopup.nexusResultTitle")}
		loading="lazy"
		referrerpolicy="no-referrer"
		style:transform="scale({scale})"
	></iframe>
</div>
<a class="nexus-open-link" href={obsUrl} target="_blank" rel="noopener noreferrer"
	>{$_("tournamentMatchPopup.openOnNexus")}</a
>

<style>
	.nexus-embed {
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 9;
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

	.nexus-open-link {
		align-self: flex-end;
		font-size: 11px;
		color: var(--text-dim);
	}

	.nexus-open-link:hover {
		color: var(--gold);
	}
</style>
