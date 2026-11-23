<script lang="ts">
	import { _ } from "$lib/i18n";
	import type { TournamentGameMode, TournamentRegistrationKind } from "$lib/types";
	import { TIERS, renderMarkdown } from "$lib/uiCommon";

	let {
		name = $bindable(),
		description = $bindable(),
		registrationType = $bindable(),
		gameMode = $bindable(),
		tournamentType = $bindable(),
		breakTiesEnabled = $bindable(),
		rankedEnabled = $bindable(),
		overrideEloEnabled = $bindable(),
		overrideEloValue = $bindable(),
		minTier = $bindable(),
		maxTier = $bindable(),
		minCost = $bindable(),
		maxCost = $bindable(),
		minCharacters = $bindable(),
		discordRoleName = $bindable(),
		discordChannelName = $bindable(),
		visible = $bindable(),
		registrationStartDate = $bindable(),
		registrationEndDate = $bindable(),
		tournamentStartDate = $bindable(),
		tournamentEndDate = $bindable(),
		editableTypeAndMode = true,
		showErrors = false,
	}: {
		name: string;
		description: string;
		registrationType: TournamentRegistrationKind;
		gameMode: TournamentGameMode;
		tournamentType: string;
		breakTiesEnabled: boolean;
		rankedEnabled: boolean;
		overrideEloEnabled: boolean;
		overrideEloValue: number;
		minTier: string;
		maxTier: string;
		minCost: number;
		maxCost: number;
		minCharacters: number;
		discordRoleName: string;
		discordChannelName: string;
		visible: boolean;
		registrationStartDate: string;
		registrationEndDate: string;
		tournamentStartDate: string;
		tournamentEndDate: string;
		editableTypeAndMode?: boolean;
		showErrors?: boolean;
	} = $props();

	let descriptionPreview = $derived(renderMarkdown(description));
</script>

{#snippet checkbox(id: string, checked: boolean, label: string, onToggle: () => void, disabled = false)}
	<div class="check-row" class:check-disabled={disabled}>
		<span class="cb-wrap">
			<input {id} type="checkbox" class="cb-input" {checked} {disabled} onchange={onToggle} />
			{#if checked}
				<svg class="cb-check" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
			{/if}
		</span>
		<label for={id}>{label}</label>
	</div>
{/snippet}

<div class="form-section">
	<div class="section-label">{$_("tournamentFormFields.sectionBasic")}</div>
	<div class="form-grid name-row">
		<div class="form-group">
			<label for="f-name">{$_("tournamentFormFields.nameLabel")}</label>
			<input
				id="f-name"
				type="text"
				class:invalid={showErrors && !name.trim()}
				bind:value={name}
				placeholder="NESC: Season 3 High-mid 1"
			/>
		</div>
		{#if editableTypeAndMode}
			<div class="form-group">
				<label for="f-registration-type">{$_("tournamentFormFields.registrationTypeLabel")}</label>
				<select id="f-registration-type" bind:value={registrationType}>
					<option value="solo">1x1</option>
					<option value="team">2x2</option>
				</select>
			</div>
			<div class="form-group">
				<label for="f-game-mode">{$_("tournamentFormFields.gameModeLabel")}</label>
				<select id="f-game-mode" bind:value={gameMode}>
					<option value="shiyu_defense">Shiyu Defense</option>
					<option value="deadly_assault">Deadly Assault</option>
				</select>
			</div>
		{/if}
	</div>
	<div class="form-group description-group">
		<label for="f-description">{$_("tournamentFormFields.descriptionLabel")}</label>
		<textarea
			id="f-description"
			rows="3"
			placeholder={$_("tournamentFormFields.descriptionPlaceholder")}
			bind:value={description}
		></textarea>
	</div>
	{#if description.trim()}
		<div class="form-group description-group">
			<label for="f-description-preview">{$_("tournamentFormFields.previewLabel")}</label>
			<div id="f-description-preview" class="description-preview">{@html descriptionPreview}</div>
		</div>
	{/if}
</div>

<div class="form-section">
	<div class="section-label">{$_("tournamentFormFields.sectionFormat")}</div>
	<div class="format-row">
		<div class="form-group format-type">
			<label for="f-type">{$_("tournamentFormFields.tournamentTypeLabel")}</label>
			<select id="f-type" bind:value={tournamentType}>
				<option value="single elimination">{$_("common.singleElimination")}</option>
				<option value="double elimination">{$_("common.doubleElimination")}</option>
			</select>
		</div>
		{@render checkbox(
			"f-break-ties",
			breakTiesEnabled,
			$_("tournamentFormFields.breakTiesLabel"),
			() => (breakTiesEnabled = !breakTiesEnabled),
		)}
	</div>

	<div class="elo-panel" class:ranked={rankedEnabled}>
		<div class="elo-head">
			{@render checkbox(
				"f-ranked",
				rankedEnabled,
				$_("tournamentFormFields.rankedLabel"),
				() => (rankedEnabled = !rankedEnabled),
			)}
			<p class="field-hint">
				{rankedEnabled ? $_("tournamentFormFields.rankedHint") : $_("tournamentFormFields.unrankedHint")}
			</p>
		</div>

		<!-- Elo options only mean something for a ranked tournament. -->
		<div class="elo-option" class:off={!rankedEnabled}>
			{@render checkbox(
				"f-elo-enabled",
				overrideEloEnabled,
				$_("tournamentFormFields.fixedEloLabel"),
				() => (overrideEloEnabled = !overrideEloEnabled),
				!rankedEnabled,
			)}
			<input
				id="f-elo-value"
				type="number"
				min="1"
				aria-label={$_("tournamentFormFields.valueLabel")}
				class="elo-value"
				class:input-disabled={!rankedEnabled || !overrideEloEnabled}
				bind:value={overrideEloValue}
				disabled={!rankedEnabled || !overrideEloEnabled}
			/>
		</div>
	</div>
</div>

<div class="form-section">
	<div class="section-label">{$_("tournamentFormFields.sectionRequirements")}</div>
	<div class="form-grid">
		<div class="form-group">
			<label for="f-min-tier">{$_("tournamentFormFields.minTierLabel")}</label>
			<select id="f-min-tier" bind:value={minTier}>
				{#each TIERS as t (t.value)}<option value={String(t.value)}>{t.name}</option>{/each}
			</select>
		</div>
		<div class="form-group">
			<label for="f-max-tier">{$_("tournamentFormFields.maxTierLabel")}</label>
			<select id="f-max-tier" bind:value={maxTier}>
				{#each TIERS as t (t.value)}<option value={String(t.value)}>{t.name}</option>{/each}
			</select>
		</div>
		<div class="form-group">
			<label for="f-min-characters">{$_("tournamentFormFields.minCharactersLabel")}</label>
			<input id="f-min-characters" type="number" bind:value={minCharacters} />
		</div>
		<div class="form-group">
			<label for="f-min-cost">{$_("tournamentFormFields.minCostLabel")}</label>
			<input id="f-min-cost" type="number" bind:value={minCost} />
		</div>
		<div class="form-group">
			<label for="f-max-cost">{$_("tournamentFormFields.maxCostLabel")}</label>
			<input id="f-max-cost" type="number" bind:value={maxCost} />
		</div>
		{@render checkbox("f-visible", visible, $_("tournamentFormFields.publicLabel"), () => (visible = !visible))}
	</div>
</div>

<div class="form-section">
	<div class="section-label">Discord</div>
	<div class="form-grid">
		<div class="form-group">
			<label for="f-discord-role">{$_("tournamentFormFields.roleLabel")}</label>
			<input
				id="f-discord-role"
				type="text"
				class:invalid={showErrors && !discordRoleName.trim()}
				bind:value={discordRoleName}
				placeholder={$_("tournamentFormFields.roleNamePlaceholder")}
			/>
		</div>
		<div class="form-group">
			<label for="f-discord-channel">{$_("tournamentFormFields.channelLabel")}</label>
			<input
				id="f-discord-channel"
				type="text"
				class:invalid={showErrors && !discordChannelName.trim()}
				bind:value={discordChannelName}
				placeholder={$_("tournamentFormFields.channelNamePlaceholder")}
			/>
		</div>
	</div>
</div>

<div class="form-section">
	<div class="section-label">{$_("tournamentFormFields.sectionSchedule")}</div>
	<div class="form-grid">
		<div class="form-group">
			<label for="f-reg-start">{$_("tournamentFormFields.registrationStartLabel")}</label>
			<input
				id="f-reg-start"
				type="datetime-local"
				class:invalid={showErrors && !registrationStartDate}
				bind:value={registrationStartDate}
			/>
		</div>
		<div class="form-group">
			<label for="f-reg-end">{$_("tournamentFormFields.registrationEndLabel")}</label>
			<input
				id="f-reg-end"
				type="datetime-local"
				class:invalid={showErrors && !registrationEndDate}
				bind:value={registrationEndDate}
			/>
		</div>
	</div>
	<div class="form-grid">
		<div class="form-group">
			<label for="f-tour-start">{$_("tournamentFormFields.tournamentStartLabel")}</label>
			<input
				id="f-tour-start"
				type="datetime-local"
				class:invalid={showErrors && !tournamentStartDate}
				bind:value={tournamentStartDate}
			/>
		</div>
		<div class="form-group">
			<label for="f-tour-end">{$_("tournamentFormFields.tournamentEndLabel")}</label>
			<input
				id="f-tour-end"
				type="datetime-local"
				class:invalid={showErrors && !tournamentEndDate}
				bind:value={tournamentEndDate}
			/>
		</div>
	</div>
</div>

<style>
	.form-section {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.section-label {
		font-size: 16px;
		font-weight: 700;
		color: var(--gold);
		padding-bottom: 8px;
		border-bottom: 1px solid var(--border-soft);
		margin-bottom: 2px;
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		align-items: start;
		gap: 14px 16px;
		max-width: 820px;
	}

	.name-row {
		grid-template-columns: 2fr 1fr 1fr;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}

	.form-group label {
		font-size: 12px;
		color: var(--text-dim);
		font-weight: 600;
	}

	.description-group {
		max-width: 820px;
	}

	.check-row {
		display: flex;
		align-items: center;
		gap: 9px;
		align-self: end;
		height: 36px;
	}

	.check-row label {
		font-size: 12px;
		color: var(--text-muted);
		font-weight: 500;
		cursor: pointer;
	}

	.check-row.check-disabled label,
	.check-row.check-disabled :global(.cb-input) {
		cursor: not-allowed;
	}

	/* system select + 3rd-place toggle on one line, the toggle centred on the select */
	.format-row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 14px 28px;
		max-width: 820px;
	}

	.format-type {
		flex: 0 1 260px;
	}

	.format-row .check-row label {
		color: var(--text-dim);
		font-weight: 600;
	}

	/* "ranked" owns the Elo options, so they share one panel: the toggle heads it, the
	   dependent options sit below and dim out when the tournament is unranked */
	.elo-panel {
		max-width: 820px;
		border: 1px solid var(--border-soft);
		border-radius: var(--r-md);
		background: var(--bg-elevated);
		transition: border-color 0.15s;
	}

	.elo-panel.ranked {
		border-color: color-mix(in oklch, var(--gold) 35%, var(--border-soft));
	}

	.elo-panel .check-row {
		align-self: auto;
		height: auto;
	}

	.elo-head {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 12px 14px;
	}

	.elo-head .check-row label {
		font-size: 13px;
		font-weight: 700;
		color: var(--text);
	}

	/* lines up under the label text: 15px checkbox + 9px gap */
	.field-hint {
		margin: 0;
		padding-left: 24px;
		font-size: 12px;
		color: var(--text-dim);
		line-height: 1.4;
	}

	.elo-option {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px 16px;
		padding: 10px 14px 10px 38px;
		border-top: 1px solid var(--border-soft);
		transition: opacity 0.15s;
	}

	.elo-option.off {
		opacity: 0.4;
	}

	.elo-option .check-row label {
		color: var(--text-muted);
		font-weight: 600;
	}

	.elo-value {
		width: 96px;
	}

	.description-preview {
		width: 100%;
		border: 1px dashed var(--border);
		border-radius: var(--r-md);
		padding: 10px 12px;
		color: var(--text-muted);
		background: var(--bg-elevated);
	}

	.description-preview :global(a) {
		color: var(--gold);
		text-decoration: underline;
	}

	.description-preview :global(p) {
		margin: 0;
		line-height: 21px;
	}

	.form-group input.invalid {
		border-color: var(--danger);
	}

	@media (max-width: 640px) {
		.form-grid,
		.name-row {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
