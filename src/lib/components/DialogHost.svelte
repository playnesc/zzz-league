<script lang="ts">
	import { modal } from "$lib/actions/modal";
	import { dialogs, dismissToast } from "$lib/dialogs.svelte";
	import { _ } from "$lib/i18n";

	let promptValue = $state("");

	$effect(() => {
		if (dialogs.active?.kind === "prompt") promptValue = dialogs.active.defaultValue ?? "";
	});

	function finish(result: boolean) {
		const dialog = dialogs.active;
		if (!dialog) return;
		dialogs.active = null;
		if (dialog.kind === "confirm") dialog.resolve(result);
		else dialog.resolve(result ? promptValue : null);
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		finish(true);
	}
</script>

{#if dialogs.active}
	{@const dialog = dialogs.active}
	<!-- a confirm that names its action ("Delete", "Apply Results") uses that as its title too -->
	{@const title = dialog.title ?? dialog.confirmLabel}
	<div class="popup dialog-layer">
		<form class="card dialog-card" use:modal={() => finish(false)} onsubmit={handleSubmit}>
			{#if title}
				<h2 class="popup-title">{title}</h2>
			{/if}
			<p class="dialog-message" class:secondary={!!title}>{dialog.message}</p>
			{#if dialog.kind === "prompt"}
				<!-- svelte-ignore a11y_autofocus -->
				<input
					type={dialog.inputType ?? "text"}
					bind:value={promptValue}
					aria-label={title ?? dialog.message}
					autofocus
				/>
			{/if}
			<div class="dialog-actions">
				<button type="button" class="btn-common" onclick={() => finish(false)}>{$_("common.cancel")}</button>
				<!-- svelte-ignore a11y_autofocus -->
				<button
					type="submit"
					class="btn-common"
					class:btn-play={!(dialog.kind === "confirm" && dialog.danger)}
					class:btn-danger-ghost={dialog.kind === "confirm" && dialog.danger}
					autofocus={dialog.kind === "confirm"}
				>
					{dialog.confirmLabel ?? $_("common.confirm")}
				</button>
			</div>
		</form>
	</div>
{/if}

<div class="toast-region" aria-live="polite">
	{#each dialogs.toasts as toast (toast.id)}
		<div class="toast toast-{toast.kind}" role={toast.kind === "error" ? "alert" : "status"}>
			<p>{toast.message ?? $_("common.unexpectedError")}</p>
			<button class="icon-btn" onclick={() => dismissToast(toast.id)} aria-label={$_("common.close")}>
				<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			</button>
		</div>
	{/each}
</div>

<style>
	/* above any popup that opened this dialog */
	.dialog-layer {
		z-index: calc(var(--z-modal) + 10);
	}

	.dialog-card {
		width: 360px;
		padding: 22px 24px 24px;
		gap: 12px;
	}


	.dialog-message {
		font-size: var(--fs-md);
		line-height: 1.5;
		color: var(--text);
		white-space: pre-line;
	}

	.dialog-message.secondary {
		color: var(--text-muted);
	}

	.dialog-actions {
		margin-top: 8px;
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		flex-wrap: wrap;
	}

	.toast-region {
		position: fixed;
		right: 16px;
		bottom: 16px;
		z-index: calc(var(--z-modal) + 20);
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: min(380px, calc(100vw - 32px));
		pointer-events: none;
	}

	.toast {
		pointer-events: auto;
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 12px 10px 12px 14px;
		border-radius: var(--r-md);
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-left-width: 4px;
		box-shadow: var(--shadow-pop);
	}

	.toast p {
		flex: 1;
		font-size: var(--fs-md);
		line-height: 1.45;
		padding-top: 4px;
		overflow-wrap: anywhere;
	}

	.toast-error {
		border-left-color: var(--danger);
	}

	.toast-success {
		border-left-color: var(--success);
	}

	.toast-info {
		border-left-color: var(--info);
	}
</style>
