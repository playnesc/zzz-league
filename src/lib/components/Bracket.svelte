<script lang="ts">
	import { _ } from "$lib/i18n";
	import { dragScroll } from "$lib/actions/dragScroll";
	import { capDefaultHeight } from "$lib/actions/capDefaultHeight";
	import type { Bracket } from "$lib/backend";
	import type { TournamentMatch } from "$lib/types";
	import {
		CARD_H,
		CARD_W,
		feedersOf,
		groupBracket,
		hasByePair,
		isDouble,
		layoutBracket,
		shuffleLayout,
		type RoundKind,
	} from "$lib/bracketLayout";

	// Entrants are addressed by "key": a player's uid in solo tournaments, a team id in team
	// tournaments — the same identifiers the matches and the bracket's slots carry.
	let {
		matches,
		bracket,
		selfKey,
		started,
		labelFor,
		onOpenMatch,
		editable = false,
		editing = $bindable(false),
		onSaveLayout,
		onPreviewLayout,
		heightStorageKey,
	}: {
		matches: TournamentMatch[];
		bracket: Bracket;
		selfKey: string | null;
		// Before Start nothing is playable yet, so no match is highlighted as open.
		started: boolean;
		labelFor: (key: string) => string | undefined;
		onOpenMatch: (match: TournamentMatch) => void;
		editable?: boolean;
		editing?: boolean;
		onSaveLayout?: (slots: (string | null)[]) => Promise<void>;
		// The bracket a draft layout would generate (unsaved) — redrawn after every swap.
		onPreviewLayout?: (slots: (string | null)[]) => Promise<TournamentMatch[]>;
		// Where the panel's resized height is remembered (per tournament).
		heightStorageKey?: string;
	} = $props();

	// The panel opens at the height the Challonge embed had (600px) and can be resized between that
	// and the bracket's full height (at most 2000px, the embed's cap) — never into empty space. A
	// bracket shorter than 600px just takes its own height. The extra 56px covers the panel's padding
	// and border plus room for a horizontal scrollbar.
	const DEFAULT_HEIGHT = 600;
	const MAX_HEIGHT = 2000;
	function panelHeights(contentHeight: number) {
		const full = Math.min(contentHeight + 56, MAX_HEIGHT);
		return { min: Math.min(DEFAULT_HEIGHT, full), max: full };
	}

	const sideKey = (m: TournamentMatch, slot: 1 | 2) => (slot === 1 ? (m.p1 ?? m.p1TeamId) : (m.p2 ?? m.p2TeamId));
	const winnerKey = (m: TournamentMatch) => m.winnerId ?? m.winnerTeamId;
	const techLossKey = (m: TournamentMatch) => m.techLossUid ?? m.techLossTeamId;

	let bracketMatches = $derived(matches.filter((m) => m.section !== null));
	let byId = $derived(new Map(bracketMatches.map((m) => [m.id, m])));
	let layout = $derived(layoutBracket(bracketMatches, bracket.size, bracket.format));
	let feeders = $derived(feedersOf(bracketMatches));

	let hovered = $state<string | null>(null);
	let highlightSelf = $state(true);
	let active = $derived(hovered ?? (highlightSelf ? selfKey : null));

	// `short`: inside a mobile band tab, which already says winners/losers.
	function roundLabel(round: RoundKind, short = false) {
		switch (round.kind) {
			case "winners":
				if (round.isFinal) return $_(round.double && !short ? "bracket.winnersFinal" : "bracket.final");
				if (round.isSemi) return $_("bracket.semifinals");
				return $_(round.double && !short ? "bracket.winnersRound" : "bracket.round", { values: { n: round.round } });
			case "losers":
				if (short) return round.isFinal ? $_("bracket.final") : $_("bracket.round", { values: { n: round.round } });
				return round.isFinal ? $_("bracket.losersFinal") : $_("bracket.losersRound", { values: { n: round.round } });
			case "grand_final":
				return $_("bracket.grandFinal");
			case "third_place":
				return $_("bracket.thirdPlace");
		}
	}

	interface Row {
		key: string | null;
		label: string;
		score: string;
		cls: string;
	}

	function rows(m: TournamentMatch, feederMap = feeders): Row[] {
		const done = m.state === "complete";
		return ([1, 2] as const).map((slot) => {
			const key = sideKey(m, slot);
			if (!key) {
				const feeder = feederMap.get(m.id)?.[slot];
				const label = feeder
					? $_(feeder.kind === "winner" ? "bracket.winnerOf" : "bracket.loserOf", { values: { n: feeder.number } })
					: "—";
				return { key: null, label, score: "", cls: "row tbd" };
			}

			const cls = ["row"];
			if (done) cls.push(winnerKey(m) === key ? "win" : "lose");
			if (key === selfKey) cls.push("self");
			if (key === active) cls.push("hl");
			const result = slot === 1 ? m.resultP1 : m.resultP2;
			const score = !done ? "" : techLossKey(m) === key ? $_("bracket.techLoss") : (result ?? "");
			return { key, label: labelFor(key) ?? "…", score, cls: cls.join(" ") };
		});
	}

	const isMine = (m: TournamentMatch) => !!selfKey && (sideKey(m, 1) === selfKey || sideKey(m, 2) === selfKey);
	const playable = (m: TournamentMatch) => started && m.state === "open";

	function cardClass(m: TournamentMatch) {
		if (!playable(m)) return "match-card";
		return isMine(m) ? "match-card mine" : "match-card open";
	}

	function tag(m: TournamentMatch): { text: string; cls: string } | null {
		if (!playable(m)) return null;
		if (isMine(m)) return { text: $_("bracket.yourMatch"), cls: "tag info" };
		if (m.p1ApprovedResult !== m.p2ApprovedResult) return { text: $_("bracket.halfConfirmed"), cls: "tag gold" };
		return null;
	}

	const lineActive = (m: TournamentMatch) => !!active && m.state === "complete" && winnerKey(m) === active;

	// ---- mobile ----
	let bands = $derived(groupBracket(bracketMatches, bracket.size, bracket.format));
	let myOpenMatch = $derived(bracketMatches.find((m) => playable(m) && isMine(m)));
	let selectedBand = $state<number | null>(null);
	let selectedRound = $state<number | null>(null);

	// Opens on the viewer's own match, else the first round still being played, else the end.
	function locate(match: TournamentMatch | undefined): [number, number] | null {
		if (!match) return null;
		for (let b = 0; b < bands.length; b++) {
			const r = bands[b].rounds.findIndex((round) => round.matches.some((m) => m.id === match.id));
			if (r >= 0) return [b, r];
		}
		return null;
	}
	let defaultPosition = $derived(
		locate(myOpenMatch) ??
			locate(bracketMatches.find((m) => m.state === "open")) ?? [bands.length - 1, Math.max(bands.at(-1)!.rounds.length - 1, 0)],
	);
	let bandIndex = $derived(Math.min(selectedBand ?? defaultPosition[0], bands.length - 1));
	let roundIndex = $derived(
		Math.max(Math.min(selectedRound ?? (selectedBand === null ? defaultPosition[1] : 0), bands[bandIndex].rounds.length - 1), 0),
	);
	let visibleRound = $derived(bands[bandIndex]?.rounds[roundIndex]);

	function pickBand(b: number) {
		selectedBand = b;
		selectedRound = 0;
	}

	function pickRound(r: number) {
		selectedBand = bandIndex;
		selectedRound = r;
	}

	function jumpTo(match: TournamentMatch) {
		const position = locate(match);
		if (!position) return;
		[selectedBand, selectedRound] = position;
	}

	const bandLabel = (band: string) =>
		$_(band === "winners" ? "bracket.tabWinners" : band === "losers" ? "bracket.tabLosers" : "bracket.tabGrandFinal");

	function destination(targetId: string | null, eliminated: string) {
		const target = targetId ? byId.get(targetId) : undefined;
		return target ? `M${target.number}` : eliminated;
	}

	function footer(m: TournamentMatch) {
		if (!m.winnerToMatchId) {
			return m.section === "third_place" ? "" : $_("bracket.championNext");
		}
		const out = m.section === "winners" && isDouble(bracket.format) ? $_("bracket.toLosersBracket") : $_("bracket.eliminated");
		if (m.state === "complete") {
			const winner = winnerKey(m)!;
			const loser = sideKey(m, 1) === winner ? sideKey(m, 2)! : sideKey(m, 1)!;
			return [
				$_("bracket.goesTo", { values: { name: labelFor(winner) ?? "…", to: destination(m.winnerToMatchId, "") } }),
				$_("bracket.goesTo", { values: { name: labelFor(loser) ?? "…", to: destination(m.loserToMatchId, $_("bracket.eliminated")) } }),
			].join(" · ");
		}
		return [
			$_("bracket.winnerGoesTo", { values: { to: destination(m.winnerToMatchId, "") } }),
			$_("bracket.loserGoesTo", { values: { to: destination(m.loserToMatchId, out) } }),
		].join(" · ");
	}

	function mobileStatus(m: TournamentMatch) {
		if (m.state === "complete") return $_("bracket.statusComplete");
		if (m.state === "pending" || !started) return $_("bracket.statusWaiting");
		return tag(m)?.text ?? $_("bracket.legendOpen");
	}

	// ---- admin layout editing ----
	// The editor is the bracket itself: every player the layout places (in a first-round match, or
	// straight into a later round thanks to a bye) can be dragged onto another one, or two can be
	// clicked (touch, keyboard), to swap their slots — so whoever should play the extra first-round
	// match instead of getting the bye just trades places. Byes themselves stay where they are.
	// After each swap the server generates the bracket for the draft (onPreviewLayout), so the
	// view always shows what Save will produce.
	let draft = $state<(string | null)[]>([]);
	let preview = $state<TournamentMatch[]>([]);
	let previewSeq = 0;
	let selectedKey = $state<string | null>(null);
	let dragFrom = $state<string | null>(null);
	let dragOver = $state<string | null>(null);
	let editError = $state("");
	let saving = $state(false);
	let dirty = $derived(editing && draft.join() !== bracket.slots.join());
	let editLayout = $derived(editing ? layoutBracket(preview, bracket.size, bracket.format) : null);
	let previewFeeders = $derived(feedersOf(preview));

	function startEditing() {
		draft = [...bracket.slots];
		preview = bracketMatches;
		selectedKey = null;
		editError = "";
		editing = true;
	}

	function cancelEditing() {
		editing = false;
		selectedKey = null;
		editError = "";
	}

	async function refreshPreview() {
		if (!onPreviewLayout) return;
		const seq = ++previewSeq;
		try {
			const next = await onPreviewLayout(draft);
			if (seq === previewSeq) preview = next;
		} catch (error) {
			if (seq === previewSeq) editError = error instanceof Error ? error.message : String(error);
		}
	}

	function applyDraft(next: (string | null)[]) {
		if (hasByePair(next)) {
			editError = $_("bracket.byePairError");
			return;
		}
		editError = "";
		draft = next;
		refreshPreview();
	}

	function swap(a: string, b: string) {
		const next = [...draft];
		const ia = next.indexOf(a);
		const ib = next.indexOf(b);
		if (ia < 0 || ib < 0) return;
		[next[ia], next[ib]] = [next[ib], next[ia]];
		applyDraft(next);
	}

	function pick(key: string) {
		if (selectedKey === null) {
			selectedKey = key;
			editError = "";
			return;
		}
		const first = selectedKey;
		selectedKey = null;
		if (first !== key) swap(first, key);
	}

	function onPickKey(e: KeyboardEvent, key: string) {
		if (e.key !== "Enter" && e.key !== " ") return;
		e.preventDefault();
		pick(key);
	}

	function onDragStart(e: DragEvent, key: string) {
		dragFrom = key;
		selectedKey = null;
		e.dataTransfer?.setData("text/plain", key);
		if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
	}

	function onDragOver(e: DragEvent, key: string) {
		if (dragFrom === null) return;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
		dragOver = key;
	}

	function onDrop(e: DragEvent, key: string) {
		e.preventDefault();
		const from = dragFrom;
		dragFrom = null;
		dragOver = null;
		if (from !== null && from !== key) swap(from, key);
	}

	function onDragEnd() {
		dragFrom = null;
		dragOver = null;
	}

	function randomize() {
		selectedKey = null;
		applyDraft(shuffleLayout(draft));
	}

	async function save() {
		if (!onSaveLayout || saving) return;
		saving = true;
		try {
			await onSaveLayout(draft);
			editing = false;
		} finally {
			saving = false;
		}
	}
</script>

{#if editing}
	<div class="edit-bar">
		<div class="edit-text">
			<span class="edit-title">{$_("bracket.editingTitle")}</span>
			<span class="edit-hint">{$_("bracket.editingHint")}</span>
		</div>
		<div class="edit-actions">
			{#if dirty}<span class="unsaved">{$_("bracket.unsavedChanges")}</span>{/if}
			<button type="button" class="btn-common btn-sm" onclick={randomize}>
				<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>
				{$_("bracket.randomize")}
			</button>
			<button type="button" class="btn-common btn-sm" onclick={cancelEditing}>{$_("bracket.cancel")}</button>
			<button type="button" class="btn-common btn-sm btn-play" class:btn-loading={saving} disabled={!dirty} onclick={save}
				>{$_("bracket.saveLayout")}</button
			>
		</div>
	</div>
	{#if editError}<p class="edit-error">{editError}</p>{/if}

	{#if editLayout}
		{@const h = panelHeights(editLayout.height)}
		<div
			class="well pannable sized"
			class:resizable={h.max > h.min}
			style="min-height: {h.min}px; max-height: {h.max}px"
			use:dragScroll
			use:capDefaultHeight={{ defaultHeight: DEFAULT_HEIGHT, maxHeight: h.max, storageKey: heightStorageKey }}
		>
			<div class="canvas" style="width: {editLayout.width}px; height: {editLayout.height}px">
				<svg class="lines" width={editLayout.width} height={editLayout.height} aria-hidden="true">
					{#each editLayout.connectors as c (c.from.id)}
						<path d={c.d} />
					{/each}
				</svg>
				{#if editLayout.divider}
					<div class="divider" style="top: {editLayout.divider.y}px; width: {editLayout.divider.width}px"></div>
				{/if}
				{#each editLayout.labels as label (`${label.x}:${label.y}`)}
					<span class="column-label" style="left: {label.x}px; top: {label.y}px">{roundLabel(label.round)}</span>
				{/each}
				{#each editLayout.placed as p (p.match.id)}
					<div class="match-card" style="left: {p.x}px; top: {p.y}px; width: {CARD_W}px; height: {CARD_H}px">
						<span class="num">{p.match.number}</span>
						<span class="rows">
							{#each rows(p.match, previewFeeders) as row, i (i)}
								{#if row.key}
									{@const key = row.key}
									<div
										class="row slot-row"
										class:selected={selectedKey === key}
										class:drop-target={dragOver === key && dragFrom !== key}
										class:dragging={dragFrom === key}
										role="button"
										tabindex="0"
										draggable="true"
										aria-pressed={selectedKey === key}
										aria-label={$_("bracket.moveEntrant", { values: { name: row.label } })}
										onclick={() => pick(key)}
										onkeydown={(e) => onPickKey(e, key)}
										ondragstart={(e) => onDragStart(e, key)}
										ondragover={(e) => onDragOver(e, key)}
										ondragleave={() => dragOver === key && (dragOver = null)}
										ondrop={(e) => onDrop(e, key)}
										ondragend={onDragEnd}
									>
										<svg class="grip" aria-hidden="true" width="8" height="12" viewBox="0 0 8 12" fill="currentColor"><circle cx="2" cy="2" r="1.2" /><circle cx="6" cy="2" r="1.2" /><circle cx="2" cy="6" r="1.2" /><circle cx="6" cy="6" r="1.2" /><circle cx="2" cy="10" r="1.2" /><circle cx="6" cy="10" r="1.2" /></svg>
										<span class="name">{row.label}</span>
									</div>
								{:else}
									<span class={row.cls}><span class="name">{row.label}</span></span>
								{/if}
							{/each}
						</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
{:else if bracketMatches.length > 0}
	<div class="toolbar">
		<div class="legend">
			<span class="legend-item"><span class="swatch swatch-open"></span>{$_("bracket.legendOpen")}</span>
			{#if selfKey}<span class="legend-item"><span class="swatch swatch-mine"></span>{$_("bracket.yourMatch")}</span>{/if}
			<span class="legend-item"><span class="dot"></span>{$_("bracket.legendWinner")}</span>
			<span class="legend-hint">{$_("bracket.hoverHint")}</span>
		</div>
		<div class="toolbar-actions">
			{#if selfKey}
				<label class="toggle">
					<span class="cb-wrap">
						<input type="checkbox" class="cb-input" bind:checked={highlightSelf} />
						{#if highlightSelf}
							<svg class="cb-check" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
						{/if}
					</span>
					<span>{$_("bracket.highlightMyPath")}</span>
				</label>
			{/if}
			{#if editable}
				<button type="button" class="btn-common btn-sm" onclick={startEditing}>
					<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>
					{$_("bracket.editLayout")}
				</button>
			{/if}
		</div>
	</div>

	{@const h = panelHeights(layout.height)}
	<div
		class="well desktop pannable sized"
		class:resizable={h.max > h.min}
		style="min-height: {h.min}px; max-height: {h.max}px"
		use:dragScroll
		use:capDefaultHeight={{ defaultHeight: DEFAULT_HEIGHT, maxHeight: h.max, storageKey: heightStorageKey }}
	>
		<div class="canvas" style="width: {layout.width}px; height: {layout.height}px">
			<svg class="lines" width={layout.width} height={layout.height} aria-hidden="true">
				{#each layout.connectors as c (c.from.id)}
					<path d={c.d} class:on={lineActive(c.from)} />
				{/each}
			</svg>
			{#if layout.divider}
				<div class="divider" style="top: {layout.divider.y}px; width: {layout.divider.width}px"></div>
			{/if}
			{#each layout.labels as label (`${label.x}:${label.y}`)}
				<span class="column-label" style="left: {label.x}px; top: {label.y}px">{roundLabel(label.round)}</span>
			{/each}
			{#each layout.placed as p (p.match.id)}
				{@const t = tag(p.match)}
				{#if t}
					<span class={t.cls} style="left: {p.x}px; top: {p.y - 17}px"><span class="tag-dot"></span>{t.text}</span>
				{/if}
				<button
					type="button"
					class={cardClass(p.match)}
					style="left: {p.x}px; top: {p.y}px; width: {CARD_W}px; height: {CARD_H}px"
					aria-label={$_("bracket.openMatch", { values: { n: p.match.number } })}
					onclick={() => onOpenMatch(p.match)}
				>
					<span class="num">{p.match.number}</span>
					<span class="rows">
						{#each rows(p.match) as row, i (i)}
							<span
								class={row.cls}
								role="presentation"
								onmouseenter={() => (hovered = row.key)}
								onmouseleave={() => (hovered = null)}
							>
								<span class="name">{row.label}</span>
								<span class="score">{row.score}</span>
							</span>
						{/each}
					</span>
				</button>
			{/each}
		</div>
	</div>

	<div class="mobile">
		{#if myOpenMatch}
			{@const opponent = sideKey(myOpenMatch, 1) === selfKey ? sideKey(myOpenMatch, 2) : sideKey(myOpenMatch, 1)}
			<button type="button" class="next-match" onclick={() => jumpTo(myOpenMatch!)}>
				<span class="next-head">{$_("bracket.yourMatch")} · M{myOpenMatch.number}</span>
				<span class="next-who">
					<span class="self-name">{labelFor(selfKey!) ?? "…"}</span>
					<span class="vs">{$_("common.versus")}</span>
					<span>{opponent ? (labelFor(opponent) ?? "…") : "—"}</span>
				</span>
			</button>
		{/if}

		{#if bands.length > 1}
			<div class="tabs" role="tablist" aria-label={$_("bracket.bracketSide")}>
				{#each bands as band, b (band.band)}
					<button type="button" role="tab" class="tab" class:on={b === bandIndex} aria-selected={b === bandIndex} onclick={() => pickBand(b)}
						>{bandLabel(band.band)}</button
					>
				{/each}
			</div>
		{/if}
		{#if bands[bandIndex].rounds.length > 1}
			<div class="chips">
				{#each bands[bandIndex].rounds as round, r (round.key)}
					<button type="button" class="chip" class:on={r === roundIndex} aria-pressed={r === roundIndex} onclick={() => pickRound(r)}
						>{roundLabel(round.round, true)}</button
					>
				{/each}
			</div>
		{/if}

		<div class="mobile-list">
			{#each visibleRound.matches as m (m.id)}
				{@const f = footer(m)}
				<button type="button" class="m-card {cardClass(m)}" aria-label={$_("bracket.openMatch", { values: { n: m.number } })} onclick={() => onOpenMatch(m)}>
					<span class="m-head"><span>M{m.number}</span><span class="m-status">{mobileStatus(m)}</span></span>
					{#each rows(m) as row, i (i)}
						<span class={row.cls}><span class="name">{row.label}</span><span class="score">{row.score}</span></span>
					{/each}
					{#if f}<span class="m-foot">{f}</span>{/if}
				</button>
			{/each}
		</div>
	</div>
{/if}

<style>
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 10px 20px;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 16px;
		font-size: var(--fs-sm);
		color: var(--text-muted);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.legend-hint {
		color: var(--text-dim);
	}

	.swatch {
		width: 14px;
		height: 10px;
		border-radius: 3px;
		border: 1.5px solid var(--gold-border);
	}

	.swatch-mine {
		border-color: var(--info);
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--success);
	}

	.toolbar-actions {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.toggle {
		display: flex;
		align-items: center;
		gap: 7px;
		cursor: pointer;
		font-size: var(--fs-sm);
		color: var(--text-muted);
		white-space: nowrap;
	}

	.well {
		overflow-x: auto;
		padding: 20px;
		background: var(--bg-elevated);
		border: 1px solid var(--border-soft);
		border-radius: var(--r-lg);
	}

	.canvas {
		position: relative;
	}

	.sized {
		overflow: auto;
	}

	.resizable {
		resize: vertical;
	}

	/* Grab-and-drag panning (see dragScroll): the hand shows over the empty canvas, and while a
	   pan is under way it overrides every card's own cursor and stops text getting selected. */
	.pannable {
		cursor: grab;
	}

	.pannable:global(.panning),
	.pannable:global(.panning) * {
		cursor: grabbing !important;
		user-select: none;
	}

	.lines {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: visible;
	}

	.lines path {
		fill: none;
		stroke: var(--border);
		stroke-width: 2;
	}

	.lines path.on {
		stroke: var(--gold);
	}

	.divider {
		position: absolute;
		left: 0;
		height: 1px;
		background: var(--border-soft);
	}

	.column-label {
		position: absolute;
		font-size: var(--fs-xs);
		font-weight: 700;
		color: var(--text-dim);
		white-space: nowrap;
	}

	.tag {
		position: absolute;
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 10px;
		font-weight: 700;
		white-space: nowrap;
	}

	.tag.gold {
		color: var(--gold);
	}

	.tag.info {
		color: var(--info);
	}

	.tag-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
	}

	.match-card {
		position: absolute;
		display: flex;
		padding: 0;
		background: var(--surface-2);
		border: 1px solid var(--surface-hover);
		border-radius: var(--r-md);
		overflow: hidden;
		font: inherit;
		color: var(--text);
		text-align: left;
		cursor: pointer;
		transition: border-color 0.15s;
	}

	.match-card:hover {
		border-color: var(--gold-border);
	}

	.match-card.open {
		border-color: color-mix(in oklch, var(--gold) 60%, transparent);
	}

	.match-card.mine {
		border-color: color-mix(in oklch, var(--info) 80%, transparent);
	}

	.num {
		width: 24px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 10px;
		font-weight: 700;
		color: var(--text-dim);
		border-right: 1px solid var(--surface-hover);
	}

	.match-card.open .num {
		color: var(--gold);
		background: var(--gold-dim);
	}

	.match-card.mine .num {
		color: var(--info);
		background: var(--info-dim);
	}

	.rows {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.row {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 10px;
		min-width: 0;
		transition: background 0.12s;
	}

	.row + .row {
		border-top: 1px solid var(--surface-hover);
	}

	.row.hl {
		background: var(--gold-dim);
	}

	.name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 12.5px;
		font-weight: 600;
	}

	.score {
		font-size: var(--fs-sm);
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		color: var(--text-dim);
	}

	.row.win .name {
		font-weight: 700;
	}

	.row.win .score {
		color: var(--success);
	}

	.row.lose .name {
		color: var(--text-muted);
	}

	.row.self .name {
		color: var(--info);
	}

	.row.tbd .name {
		color: var(--text-dim);
		font-style: italic;
		font-weight: 500;
	}

	/* ---- mobile ---- */
	.mobile {
		display: none;
		flex-direction: column;
		gap: 12px;
	}

	@media (max-width: 640px) {
		.desktop {
			display: none;
		}

		.mobile {
			display: flex;
		}

		.legend-hint {
			display: none;
		}
	}

	.next-match {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 14px;
		border-radius: var(--r-lg);
		background: var(--info-dim);
		border: 1px solid color-mix(in oklch, var(--info) 50%, transparent);
		font: inherit;
		color: var(--text);
		text-align: left;
		cursor: pointer;
	}

	.next-head {
		font-size: var(--fs-xs);
		font-weight: 700;
		color: var(--info);
	}

	.next-who {
		display: flex;
		align-items: center;
		gap: 10px;
		font-weight: 700;
		min-width: 0;
	}

	.self-name {
		color: var(--info);
	}

	.vs {
		color: var(--text-dim);
		font-size: var(--fs-sm);
		font-weight: 500;
	}

	.tabs {
		display: flex;
		gap: 4px;
		padding: 4px;
		border-radius: 10px;
		background: var(--surface);
		border: 1px solid var(--border-soft);
	}

	.tab {
		flex: 1;
		height: 44px;
		border: none;
		border-radius: 7px;
		background: transparent;
		font: inherit;
		font-size: 13px;
		font-weight: 700;
		color: var(--text-muted);
		cursor: pointer;
	}

	.tab.on {
		background: var(--gold-dim);
		color: var(--gold);
	}

	.chips {
		display: flex;
		gap: 6px;
		overflow-x: auto;
		padding-bottom: 2px;
	}

	.chip {
		height: 36px;
		min-width: 44px;
		padding: 0 14px;
		border-radius: var(--r-pill);
		border: 1px solid var(--border);
		background: var(--bg-elevated);
		font: inherit;
		font-size: var(--fs-sm);
		font-weight: 700;
		color: var(--text-muted);
		white-space: nowrap;
		cursor: pointer;
	}

	.chip.on {
		background: var(--text);
		color: var(--bg);
		border-color: var(--text);
	}

	.mobile-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.m-card {
		position: static;
		flex-direction: column;
		width: 100%;
	}

	.m-card .row {
		flex: none;
		height: 44px;
		padding: 0 12px;
	}

	.m-card .name {
		font-size: var(--fs-md);
	}

	.m-head {
		display: flex;
		justify-content: space-between;
		padding: 8px 12px;
		font-size: var(--fs-xs);
		font-weight: 700;
		color: var(--text-dim);
		border-bottom: 1px solid var(--surface-hover);
	}

	.m-card.open .m-status {
		color: var(--gold);
	}

	.m-card.mine .m-status {
		color: var(--info);
	}

	.m-foot {
		padding: 7px 12px;
		font-size: var(--fs-xs);
		color: var(--text-dim);
		border-top: 1px solid var(--surface-hover);
		background: var(--surface);
	}

	/* ---- layout editing ---- */
	.edit-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 14px;
		border-radius: var(--r-md);
		background: color-mix(in oklch, var(--gold) 8%, transparent);
		border: 1px solid var(--gold-border);
	}

	.edit-text {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.edit-title {
		font-size: 13px;
		font-weight: 700;
		color: var(--gold);
	}

	.edit-hint {
		font-size: var(--fs-sm);
		color: var(--text-muted);
	}

	.edit-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}

	.unsaved {
		font-size: var(--fs-sm);
		font-weight: 600;
		color: var(--text-muted);
	}

	.edit-error {
		margin: 0;
		font-size: var(--fs-sm);
		font-weight: 600;
		color: var(--danger);
	}

	.slot-row {
		cursor: grab;
		user-select: none;
	}

	.slot-row:hover {
		background: var(--surface-hover);
	}

	.slot-row.dragging {
		opacity: 0.4;
	}

	.slot-row.drop-target {
		background: var(--gold-dim);
		box-shadow: inset 0 0 0 1.5px var(--gold-border);
	}

	.slot-row.selected,
	.slot-row.selected:hover {
		background: color-mix(in oklch, var(--gold) 18%, transparent);
		box-shadow: inset 0 0 0 1.5px var(--gold);
	}

	.grip {
		flex-shrink: 0;
		color: var(--text-dim);
	}
</style>
