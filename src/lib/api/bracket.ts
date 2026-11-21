import { apiGet, apiPost, apiPut, ApiError } from '../api';
import type { BracketSection, TournamentMatch } from '../types';

// The round-1 layout: one entry per slot (null = bye) — a player's uid in solo tournaments, a
// team id in team tournaments. The matches themselves come from listMatches.
export interface Bracket {
	format: string;
	size: number;
	slots: (string | null)[];
	// Filled once the tournament is finished; ranks can be shared ("5, 5, 7, 7").
	standings: { playerId: string | null; teamId: string | null; rank: number }[];
}

// null until the bracket exists, and for tournaments that were run on Challonge.
export async function getBracket(tournamentId: string): Promise<Bracket | null> {
	try {
		return await apiGet<Bracket>(`/api/tournaments/${tournamentId}/bracket`);
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) return null;
		throw e;
	}
}

export async function saveBracketLayout(tournamentId: string, slots: (string | null)[]): Promise<Bracket> {
	return await apiPut<Bracket>(`/api/tournaments/${tournamentId}/bracket/layout`, { slots });
}

interface BracketPreviewMatchDto {
	number: number;
	section: BracketSection;
	round: number;
	position: number;
	p1: string | null;
	p2: string | null;
	winnerToNumber: number | null;
	winnerToSlot: number | null;
	loserToNumber: number | null;
	loserToSlot: number | null;
}

// The bracket a layout would generate, without saving it — shaped like real matches (ids made up
// from the match numbers, entrants in p1/p2 whether they're players or teams) so the bracket view
// can draw it as is.
export async function previewBracketLayout(tournamentId: string, slots: (string | null)[]): Promise<TournamentMatch[]> {
	const dtos = await apiPost<BracketPreviewMatchDto[]>(`/api/tournaments/${tournamentId}/bracket/preview`, { slots });
	const id = (n: number | null) => (n === null ? null : `preview-${n}`);
	return dtos.map((d) => ({
		id: `preview-${d.number}`,
		tournamentId,
		number: d.number,
		section: d.section,
		round: d.round,
		position: d.position,
		winnerToMatchId: id(d.winnerToNumber),
		winnerToSlot: d.winnerToSlot,
		loserToMatchId: id(d.loserToNumber),
		loserToSlot: d.loserToSlot,
		p1: d.p1,
		p2: d.p2,
		p1TeamId: null,
		p2TeamId: null,
		state: d.p1 && d.p2 ? 'open' : 'pending',
		winnerId: null,
		winnerTeamId: null,
		resultScreenshot: null,
		resultP1: null,
		resultP2: null,
		p1ApprovedResult: false,
		p2ApprovedResult: false,
		techLossUid: null,
		techLossTeamId: null,
		nexusResultId: null,
		nexusTotalGames: null,
		nexusCountedGames: null,
		nexusMissing: null,
	}));
}
