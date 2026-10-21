<script lang="ts">
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import SidePanel from "$lib/components/SidePanel.svelte";
	import TournamentMemberRegistrationFields from "$lib/components/TournamentMemberRegistrationFields.svelte";
	import { _, locale, formatDate } from "$lib/i18n";
	import { applyForTournament, getMyLastRegistration, getTournament, listRegistrations } from "$lib/backend";
	import { getAuthSession } from "$lib/auth.svelte";
	import type { LastRegistrationData, Tournament, TournamentRegistration } from "$lib/types";
	import { isLocked, isRegistrationWindowOpen, playerTierValue } from "$lib/tournamentState";
	import {
		applyDetailsToMemberForm,
		emptyMemberRegistrationForm,
		isMemberRegistrationFormComplete,
		memberRegistrationFormToInput,
		memberRegistrationScreenshotFiles,
	} from "$lib/tournamentRegistrationForm";
	import {
		dateDisplayOptions,
		filesFromImageFile,
		imageFileFromPasteEvent,
		isImageTooLarge,
		MAX_IMAGE_SIZE_MB,
	} from "$lib/uiCommon";
	import { onMount } from "svelte";

	const session = getAuthSession();

	const id = $derived(page.params.id);

	let now = $state(Date.now());
	let tournament = $state<Tournament>();
	let myRegistration = $state<TournamentRegistration | null>(null);
	let lastRegistration = $state<LastRegistrationData | null>(null);
	let regLoaded = $state(false);

	let form = $state(emptyMemberRegistrationForm());
	let awareness = $state(false);
	let status = $state("");
	let showErrors = $state(false);

	let fieldsInitialized = false;
	function applyRegistrationData(reg: TournamentRegistration | null) {
		regLoaded = true;
		if (!reg || fieldsInitialized) return;
		fieldsInitialized = true;
		applyDetailsToMemberForm(form, reg.player1);
	}

	let currentUserTier = $derived(session.user ? playerTierValue(session.user) : 0);
	let tierEligible = $derived(
		!!tournament &&
			currentUserTier >= tournament.minTier &&
			currentUserTier <= tournament.maxTier,
	);
	let registrationWindowOpen = $derived(
		!!tournament &&
			isRegistrationWindowOpen(
				tournament.state,
				tournament.registrationStartDate,
				tournament.registrationEndDate,
				now,
			),
	);

	$effect(() => {
		function onPaste(e: ClipboardEvent) {
			if (!regLoaded) return;
			const file = imageFileFromPasteEvent(e);
			if (!file) return;

			const files = filesFromImageFile(file);
			if (!form.rosterScreenshot || form.rosterScreenshot.length === 0) {
				form.rosterScreenshot = files;
			} else {
				form.hoyolabScreenshot = files;
			}
			e.preventDefault();
		}

		window.addEventListener("paste", onPaste);
		return () => window.removeEventListener("paste", onPaste);
	});

	function handlePrefillFromLastRegistration() {
		applyDetailsToMemberForm(form, lastRegistration);
	}

	let isRegistering = $state(false);
	async function handleRegister() {
		if (isRegistering || !tournament) return;

		if (!awareness) {
			showErrors = true;
			status = $_("pageTournamentRegister.awarenessRequired");
			return;
		}

		if (!isMemberRegistrationFormComplete(form)) {
			showErrors = true;
			status = $_("pageTournamentRegister.fillAllFields");
			return;
		}

		if (memberRegistrationScreenshotFiles(form).some(isImageTooLarge)) {
			status = $_("pageTournamentRegister.fileTooLarge", { values: { maxSize: MAX_IMAGE_SIZE_MB } });
			return;
		}

		if (!session.user) return;

		showErrors = false;
		isRegistering = true;
		try {
			await applyForTournament(tournament.id, session.user.uid, memberRegistrationFormToInput(form));
			await goto(resolve(`/tournaments/${tournament.id}`));
		} catch (error: any) {
			status = error.message;
		} finally {
			isRegistering = false;
		}
	}

	onMount(() => {
		let cancelled = false;

		getTournament(id!).then((loaded) => {
			if (!cancelled) tournament = loaded ?? undefined;
		});

		const interval = setInterval(() => {
			now = Date.now();
		}, 1000);

		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	});

	$effect(() => {
		const uid = session.user?.uid;
		const tournamentId = id;
		if (!uid || !tournamentId) {
			myRegistration = null;
			lastRegistration = null;
			regLoaded = true;
			return;
		}

		let cancelled = false;
		// Fetched here rather than kept on session.user, so it reflects registrations made earlier
		// in this session. A failed fetch only loses the prefill button, never the form.
		Promise.all([
			listRegistrations(tournamentId),
			getMyLastRegistration().catch(() => null),
		]).then(([registrations, last]) => {
			if (cancelled) return;
			lastRegistration = last;
			const mine = registrations.find((r) => r.playerId === uid) ?? null;
			myRegistration = mine;
			applyRegistrationData(mine);
		});

		return () => {
			cancelled = true;
		};
	});
</script>

<div class="layout">
	<SidePanel></SidePanel>

	<div class="card main-content">
		{#if tournament}
			<h2 class="page-title">{$_("pageTournamentRegister.pageTitle", { values: { name: tournament.name } })}</h2>

			{#if !session.ready}
				<p class="notice">{$_("common.loading")}</p>
			{:else if tournament.visible === false && !session.isModerator}
				<p class="notice">{$_("pageTournamentRegister.noPermission")}</p>
			{:else if !session.user}
				<p class="notice">{$_("pageTournamentRegister.loginRequired")}</p>
			{:else if !tierEligible}
				<p class="notice">{$_("pageTournamentRegister.tierNotEligible")}</p>
			{:else if isLocked(tournament.state) || tournament.challongeTournamentId}
				<p class="notice">{$_("pageTournamentRegister.tournamentStarted")}</p>
			{:else if !registrationWindowOpen}
				<p class="notice">{$_("pageTournamentRegister.registrationClosed")}</p>
			{:else if regLoaded}
				{#if lastRegistration && !myRegistration}
					<button
						type="button"
						class="btn-common prefill-btn"
						onclick={handlePrefillFromLastRegistration}
						>{$_("pageTournamentRegister.prefillButton")}</button
					>
				{/if}

				<TournamentMemberRegistrationFields idPrefix="reg" {form} {showErrors} />

				<div class="divider"></div>

				<div class="check-row">
					<span class="cb-wrap">
						<input
							id="awareness"
							type="checkbox"
							class="cb-input"
							class:invalid={showErrors && !awareness}
							bind:checked={awareness}
						/>
						{#if awareness}
							<svg class="cb-check" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
						{/if}
					</span>
					<label for="awareness"
						>{$_("pageTournamentRegister.awarenessPrefix")} <span class="value-highlight"
							>{formatDate(new Date(tournament.tournamentStartDate), dateDisplayOptions, $locale)}</span
						>
						{$_("pageTournamentRegister.awarenessBetween")}
						<span class="value-highlight"
							>{formatDate(new Date(tournament.tournamentEndDate), dateDisplayOptions, $locale)}</span
						>
					</label>
				</div>

				{#if status}<p class="status error">{status}</p>{/if}
				<div class="form-actions">
					<button
						class="btn-common btn-play"
						class:btn-loading={isRegistering}
						onclick={handleRegister}
						>{#if myRegistration}{$_("pageTournamentRegister.updateRegistration")}{:else}{$_("pageTournamentRegister.register")}{/if}</button
					>
					<a
						class="btn-common"
						href={resolve(`/tournaments/${tournament.id}`)}>{$_("common.cancel")}</a
					>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.page-title {
		font-size: 20px;
		padding-bottom: 16px;
	}

	.prefill-btn {
		align-self: flex-start;
		padding: 0 14px;
		height: 32px;
		font-size: 12px;
	}

	.divider {
		height: 1px;
		background: var(--border-soft);
		width: 100%;
	}

	.check-row {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		max-width: 760px;
	}

	.check-row .cb-wrap {
		margin-top: 2px;
	}

	.check-row label {
		font-size: 12px;
		color: var(--text-muted);
		line-height: 1.6;
		cursor: pointer;
	}

	.cb-input.invalid {
		border-color: var(--danger);
	}

</style>
