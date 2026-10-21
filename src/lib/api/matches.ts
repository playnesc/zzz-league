import { apiGet, apiPost } from '../api';
import type { TournamentMatch } from '../types';
import { screenshotToBase64, type NexusPreviewDto, type TournamentMatchDto } from './dtos';

export type NexusSide = 'left' | 'right';

function toMatch(dto: TournamentMatchDto): TournamentMatch {
	return {
		...dto,
		p1: dto.p1PlayerId,
		p2: dto.p2PlayerId,
		winnerId: dto.winnerPlayerId,
		resultScreenshot: dto.resultScreenshotUrl,
		techLossUid: dto.techLossPlayerId,
	};
}

export async function listMatches(tournamentId: string): Promise<TournamentMatch[]> {
	return (await apiGet<TournamentMatchDto[]>(`/api/tournaments/${tournamentId}/matches`)).map(toMatch);
}

// Parses a pasted Nexus link for a solo match without saving it. nexusP1Side is only needed when
// the response came back with p1IsLeft === null (names on Nexus didn't match the two players).
export async function previewNexusResult(
	tournamentId: string,
	matchId: string,
	url: string,
	nexusP1Side: NexusSide | null = null,
): Promise<NexusPreviewDto> {
	return await apiPost<NexusPreviewDto>(`/api/tournaments/${tournamentId}/matches/${matchId}/nexus-preview`, {
		url,
		nexusP1Side,
	});
}

// Solo matches: pass the Nexus link (or null to just confirm the result already stored) — typed
// results and screenshots are no longer accepted from players. Team matches: typed result +
// screenshot, as before.
export async function approveResult(
	tournamentId: string,
	matchId: string,
	resultP1: string | null,
	resultP2: string | null,
	resultScreenshot: File | null = null,
	nexusResultUrl: string | null = null,
	nexusP1Side: NexusSide | null = null,
): Promise<TournamentMatch> {
	const dto = await apiPost<TournamentMatchDto>(`/api/tournaments/${tournamentId}/matches/${matchId}/result`, {
		resultP1,
		resultP2,
		resultScreenshot: resultScreenshot ? await screenshotToBase64(resultScreenshot) : undefined,
		nexusResultUrl,
		nexusP1Side,
	});
	return toMatch(dto);
}

export async function adminSetMatchResult(
	tournamentId: string,
	matchId: string,
	resultP1: string | null,
	resultP2: string | null,
	resultScreenshot: File | null = null,
	techLossUid: string | null = null,
	techLossTeamId: string | null = null,
	nexusResultUrl: string | null = null,
	nexusP1Side: NexusSide | null = null,
): Promise<TournamentMatch> {
	const dto = await apiPost<TournamentMatchDto>(`/api/tournaments/${tournamentId}/matches/${matchId}/admin-result`, {
		resultP1,
		resultP2,
		resultScreenshot: resultScreenshot ? await screenshotToBase64(resultScreenshot) : undefined,
		techLossPlayerId: techLossUid,
		techLossTeamId,
		nexusResultUrl,
		nexusP1Side,
	});
	return toMatch(dto);
}
