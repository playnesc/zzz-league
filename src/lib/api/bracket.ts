import { apiGet, apiPut, ApiError } from '../api';

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
