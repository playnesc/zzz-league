<script lang="ts">
	import { modal } from "$lib/actions/modal";
	import NexusResultEmbed from "$lib/components/NexusResultEmbed.svelte";
	import { closeNexusPopup } from "$lib/uiCommon";
	import { _ } from "$lib/i18n";

	// The Nexus counterpart of ImageViewerPopup: the result overlay at (nearly) full screen size.
	let { resultId }: { resultId: string } = $props();
</script>

<div class="popup">
	<div class="nexus-popup-frame" use:modal={{ onclose: closeNexusPopup, label: $_("tournamentMatchPopup.nexusResultTitle") }}>
		<button class="close-btn" onclick={closeNexusPopup} aria-label={$_("common.close")}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
		</button>
		<NexusResultEmbed {resultId} expandable={false} />
	</div>
</div>

<style>
	.popup {
		background: var(--overlay-strong);
	}

	.nexus-popup-frame {
		position: relative;
		/* Embed aspect is 1700:810 (see NexusResultEmbed's CROP); capped so it stays a popup on
		   big screens rather than filling them. */
		width: min(92vw, 1280px, calc(80dvh * 1700 / 810));
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.close-btn {
		position: absolute;
		top: -14px;
		right: -14px;
		z-index: 2;
		width: 32px;
		height: 32px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--r-md);
		background: oklch(0.10 0.005 95 / 0.55);
		border: none;
		padding: 0;
		color: var(--text);
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.close-btn:hover {
		background: oklch(0.10 0.005 95 / 0.8);
	}

	@media (max-width: 640px) {
		.nexus-popup-frame {
			width: 100%;
		}

		.close-btn {
			top: 6px;
			right: 6px;
		}
	}
</style>
