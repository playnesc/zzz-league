// Pure layout math for Bracket.svelte: where each match card goes, the connector lines between
// them, and how matches group into rounds. Columns are rounds; rows are packed compactly (see
// compactCenters), so matches removed by byes leave no holes — the entrant a bye passed through
// simply appears in the next round.
import type { BracketSection, TournamentMatch } from './types';

// Sized so an 8-player double elimination (5 columns) fits the tournament page at 1440px.
export const CARD_W = 168;
export const CARD_H = 60;
const COL = CARD_W + 32;
const UNIT = CARD_H + 16; // row pitch: one card plus a 16px gap
const LABEL_H = 28;
const SECTION_GAP = 40;

export type RoundKind =
	| { kind: 'winners'; round: number; isFinal: boolean; isSemi: boolean; double: boolean }
	| { kind: 'losers'; round: number; isFinal: boolean }
	| { kind: 'grand_final' }
	| { kind: 'third_place' };

export interface PlacedMatch {
	match: TournamentMatch;
	x: number;
	y: number; // top of the card
}

export interface ColumnLabel {
	x: number;
	y: number;
	round: RoundKind;
}

export interface Connector {
	from: TournamentMatch;
	d: string; // SVG path
}

export interface BracketLayout {
	width: number;
	height: number;
	placed: PlacedMatch[];
	labels: ColumnLabel[];
	connectors: Connector[];
	divider: { y: number; width: number } | null;
}

export const isDouble = (format: string) => format === 'double elimination';

const log2 = (n: number) => Math.round(Math.log2(n));

// Compact vertical placement for one bracket section: walking each tree from its final, a match
// nobody feeds (within the section) takes the next free row — rows are one card plus a 16px gap
// apart — and every other match is centered on the matches feeding it (lined up with its only
// feeder when the other side came through a bye). Unlike tree positions this leaves no holes
// where byes removed matches. Returns centers relative to the section's top, and the height.
function compactCenters(matches: TournamentMatch[], section: 'winners' | 'losers') {
	const inSection = matches.filter((m) => m.section === section);
	const ids = new Set(inSection.map((m) => m.id));
	const feeders = new Map<string, TournamentMatch[]>();
	for (const m of inSection) {
		if (!m.winnerToMatchId || !ids.has(m.winnerToMatchId)) continue;
		const list = feeders.get(m.winnerToMatchId) ?? [];
		list[m.winnerToSlot! - 1] = m;
		feeders.set(m.winnerToMatchId, list);
	}

	const centers = new Map<string, number>();
	let rows = 0;
	const place = (m: TournamentMatch): number => {
		const kids = (feeders.get(m.id) ?? []).filter(Boolean);
		const c = kids.length
			? kids.map(place).reduce((a, b) => a + b, 0) / kids.length
			: rows++ * UNIT + CARD_H / 2;
		centers.set(m.id, c);
		return c;
	};
	inSection
		.filter((m) => !m.winnerToMatchId || !ids.has(m.winnerToMatchId))
		.sort((a, b) => a.position! - b.position!)
		.forEach(place);

	return { centers, height: rows ? (rows - 1) * UNIT + CARD_H : 0 };
}

export function layoutBracket(matches: TournamentMatch[], size: number, format: string): BracketLayout {
	const k = log2(size);
	const double = isDouble(format);
	const losersRounds = double ? 2 * (k - 1) : 0;
	const winners = compactCenters(matches, 'winners');
	const winnersHeight = winners.height;
	const placed = new Map<string, PlacedMatch>();
	const labels: ColumnLabel[] = [];
	const roundsWithMatches = new Set(matches.map((m) => `${m.section}:${m.round}`));

	for (let r = 1; r <= k; r++) {
		if (!roundsWithMatches.has(`winners:${r}`)) continue;
		labels.push({
			x: (r - 1) * COL,
			y: 0,
			round: { kind: 'winners', round: r, isFinal: r === k, isSemi: !double && r === k - 1, double },
		});
	}

	for (const m of matches) {
		if (m.section !== 'winners') continue;
		const r = m.round!;
		placed.set(m.id, { match: m, x: (r - 1) * COL, y: LABEL_H + winners.centers.get(m.id)! - CARD_H / 2 });
	}

	let height = LABEL_H + winnersHeight;
	const winnersFinal = matches.find((m) => m.section === 'winners' && m.round === k);

	const thirdPlace = matches.find((m) => m.section === 'third_place');
	if (thirdPlace && winnersFinal) {
		const final = placed.get(winnersFinal.id)!;
		const top = final.y + CARD_H + 44;
		labels.push({ x: final.x, y: top - 24, round: { kind: 'third_place' } });
		placed.set(thirdPlace.id, { match: thirdPlace, x: final.x, y: top });
		height = Math.max(height, top + CARD_H);
	}

	let divider: BracketLayout['divider'] = null;
	if (double && losersRounds > 0) {
		const dividerY = height + SECTION_GAP / 2;
		const labelY = dividerY + 18;
		const top = labelY + LABEL_H;
		for (let l = 1; l <= losersRounds; l++) {
			if (!roundsWithMatches.has(`losers:${l}`)) continue;
			labels.push({ x: (l - 1) * COL, y: labelY, round: { kind: 'losers', round: l, isFinal: l === losersRounds } });
		}

		const losers = compactCenters(matches, 'losers');
		for (const m of matches) {
			if (m.section !== 'losers') continue;
			const l = m.round!;
			placed.set(m.id, { match: m, x: (l - 1) * COL, y: top + losers.centers.get(m.id)! - CARD_H / 2 });
		}

		const losersHeight = losers.height;
		height = top + losersHeight;
		divider = { y: dividerY, width: (Math.max(k, losersRounds) * COL) - (COL - CARD_W) };
	}

	const grandFinal = matches.find((m) => m.section === 'grand_final');
	if (grandFinal) {
		const col = Math.max(k, losersRounds);
		const losersFinal = matches.find((m) => m.section === 'losers' && m.round === losersRounds);
		const centers = [winnersFinal, losersFinal]
			.map((m) => (m ? placed.get(m.id) : undefined))
			.filter((p): p is PlacedMatch => !!p)
			.map((p) => p.y + CARD_H / 2);
		const mid = centers.length ? centers.reduce((a, b) => a + b, 0) / centers.length : LABEL_H + CARD_H / 2;
		const top = mid - CARD_H / 2;
		labels.push({ x: col * COL, y: top - 24, round: { kind: 'grand_final' } });
		placed.set(grandFinal.id, { match: grandFinal, x: col * COL, y: top });
		if (divider) divider.width = col * COL - 24;
	}

	// Winner lines only — losers dropping into the losers bracket would cross everything; their
	// slot says "Loser of M5" instead.
	const connectors: Connector[] = [];
	for (const m of matches) {
		if (!m.winnerToMatchId) continue;
		const from = placed.get(m.id);
		const to = placed.get(m.winnerToMatchId);
		if (!from || !to) continue;
		const x1 = from.x + CARD_W;
		const y1 = from.y + CARD_H / 2;
		const x2 = to.x;
		const y2 = to.y + CARD_H / 2;
		const mx = x2 - 18;
		connectors.push({ from: m, d: `M ${x1} ${y1} H ${mx} V ${y2} H ${x2}` });
	}

	const width = Math.max(...[...placed.values()].map((p) => p.x + CARD_W), CARD_W);
	return { width, height, placed: [...placed.values()], labels, connectors, divider };
}

export interface RoundGroup {
	key: string;
	round: RoundKind;
	matches: TournamentMatch[];
}

export interface BandGroup {
	band: 'winners' | 'losers' | 'grand_final';
	rounds: RoundGroup[];
}

// The mobile view: one band (winners / losers / grand final) and one round at a time. Single
// elimination is one band; its 3rd-place match is the last "round".
export function groupBracket(matches: TournamentMatch[], size: number, format: string): BandGroup[] {
	const k = log2(size);
	const double = isDouble(format);
	const losersRounds = double ? 2 * (k - 1) : 0;
	const bySection = (section: BracketSection, round?: number) =>
		matches.filter((m) => m.section === section && (round === undefined || m.round === round)).sort((a, b) => a.number! - b.number!);

	const winners: RoundGroup[] = [];
	for (let r = 1; r <= k; r++) {
		const ms = bySection('winners', r);
		if (ms.length) winners.push({ key: `w${r}`, round: { kind: 'winners', round: r, isFinal: r === k, isSemi: !double && r === k - 1, double }, matches: ms });
	}

	const third = bySection('third_place');
	if (third.length) winners.push({ key: 'tp', round: { kind: 'third_place' }, matches: third });

	const bands: BandGroup[] = [{ band: 'winners', rounds: winners }];
	if (double) {
		const losers: RoundGroup[] = [];
		for (let l = 1; l <= losersRounds; l++) {
			const ms = bySection('losers', l);
			if (ms.length) losers.push({ key: `l${l}`, round: { kind: 'losers', round: l, isFinal: l === losersRounds }, matches: ms });
		}

		if (losers.length) bands.push({ band: 'losers', rounds: losers });
		const gf = bySection('grand_final');
		if (gf.length) bands.push({ band: 'grand_final', rounds: [{ key: 'gf', round: { kind: 'grand_final' }, matches: gf }] });
	}

	return bands;
}

// Which earlier match fills each empty side ("Winner of M3" / "Loser of M5"), keyed by match id.
export function feedersOf(matches: TournamentMatch[]) {
	const feeders = new Map<string, { 1?: Feeder; 2?: Feeder }>();
	const add = (targetId: string | null, slot: number | null, feeder: Feeder) => {
		if (!targetId || !slot) return;
		const entry = feeders.get(targetId) ?? {};
		entry[slot as 1 | 2] = feeder;
		feeders.set(targetId, entry);
	};
	for (const m of matches) {
		add(m.winnerToMatchId, m.winnerToSlot, { kind: 'winner', number: m.number! });
		add(m.loserToMatchId, m.loserToSlot, { kind: 'loser', number: m.number! });
	}
	return feeders;
}

export interface Feeder {
	kind: 'winner' | 'loser';
	number: number;
}

// Shuffles the entrants over the slots with byes in distinct round-1 pairs — the same rule the
// server enforces (two byes may never meet).
export function shuffleLayout(slots: (string | null)[]): (string | null)[] {
	const entrants = slots.filter((s): s is string => s !== null);
	const shuffle = <T>(xs: T[]) => {
		for (let i = xs.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[xs[i], xs[j]] = [xs[j], xs[i]];
		}
		return xs;
	};
	shuffle(entrants);
	const pairCount = slots.length / 2;
	const byePairs = new Set(shuffle([...Array(pairCount).keys()]).slice(0, slots.length - entrants.length));
	const next: (string | null)[] = [];
	let i = 0;
	for (let pair = 0; pair < pairCount; pair++) {
		if (!byePairs.has(pair)) next.push(entrants[i++], entrants[i++]);
		else if (Math.random() < 0.5) next.push(entrants[i++], null);
		else next.push(null, entrants[i++]);
	}
	return next;
}

export const hasByePair = (slots: (string | null)[]) =>
	slots.some((s, i) => i % 2 === 0 && s === null && slots[i + 1] === null);
