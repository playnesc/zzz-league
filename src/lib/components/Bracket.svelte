<script lang="ts">
	import { _ } from "$lib/i18n";
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
	} = $props();

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

	function rows(m: TournamentMatch): Row[] {
		const done = m.state === "complete";
		return ([1, 2] as const).map((slot) => {
			const key = sideKey(m, slot);
			if (!key) {
				const feeder = feeders.get(m.id)?.[slot];
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
	let draft = $state<(string | null)[]>([]);
	let selectedSlot = $state<number | null>(null);
	let editError = $state("");
	let saving = $state(false);
	let dirty = $derived(editing && draft.join() !== bracket.slots.join());

	function startEditing() {
		draft = [...bracket.slots];
		selectedSlot = null;
		editError = "";
		editing = true;
	}

	function cancelEditing() {
		editing = false;
		selectedSlot = null;
		editError = "";
	}

	function pickSlot(i: number) {
		if (selectedSlot === null) {
			selectedSlot = i;
			editError = "";
			return;
		}
		if (selectedSlot === i) {
			selectedSlot = null;
			return;
		}
		const next = [...draft];
		[next[selectedSlot], next[i]] = [next[i], next[selectedSlot]];
		selectedSlot = null;
		if (hasByePair(next)) {
			editError = $_("bracket.byePairError");
			return;
		}
		editError = "";
		draft = next;
	}

	function randomize() {
		draft = shuffleLayout(draft);
		selectedSlot = null;
		editError = "";
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

	let pairs = $derived(
		Array.from({ length: draft.length / 2 }, (_, p) => [2 * p, 2 * p + 1]),
	);
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

	<div class="well">
		<span class="slots-label">{$_("bracket.roundOneSlots")}</span>
		<div class="pairs">
			{#each pairs as pair (pair[0])}
				<div class="pair">
					{#each pair as i (i)}
						{@const key = draft[i]}
						{@const name = key ? (labelFor(key) ?? "…") : $_("bracket.bye")}
						<button
							type="button"
							class="slot"
							class:bye={!key}
							class:selected={selectedSlot === i}
							class:target={selectedSlot !== null && selectedSlot !== i}
							aria-pressed={selectedSlot === i}
							aria-label={$_("bracket.slotLabel", { values: { n: i + 1, name } })}
							onclick={() => pickSlot(i)}
						>
							<span class="slot-number">{i + 1}</span>
							<span class="name">{name}</span>
						</button>
					{/each}
				</div>
			{/each}
		</div>
	</div>
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

	<div class="well desktop">
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

	.slots-label {
		display: block;
		margin-bottom: 10px;
		font-size: var(--fs-xs);
		font-weight: 700;
		color: var(--text-dim);
	}

	.pairs {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 12px;
	}

	.pair {
		display: flex;
		flex-direction: column;
		border-radius: var(--r-md);
		border: 1px dashed var(--gold-border);
		background: var(--surface-2);
		overflow: hidden;
	}

	.slot {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 44px;
		padding: 0 12px;
		border: none;
		background: transparent;
		font: inherit;
		color: var(--text);
		text-align: left;
		cursor: pointer;
	}

	.slot + .slot {
		border-top: 1px solid var(--surface-hover);
	}

	.slot:hover {
		background: var(--surface-hover);
	}

	.slot.target:hover {
		background: var(--gold-dim);
	}

	.slot.selected,
	.slot.selected:hover {
		background: color-mix(in oklch, var(--gold) 18%, transparent);
		box-shadow: inset 0 0 0 1.5px var(--gold);
	}

	.slot.bye .name {
		color: var(--text-dim);
		font-style: italic;
		font-weight: 500;
		letter-spacing: 0.04em;
	}

	.slot-number {
		width: 16px;
		flex-shrink: 0;
		font-size: 10px;
		font-weight: 700;
		color: var(--text-dim);
		font-variant-numeric: tabular-nums;
	}
</style>
