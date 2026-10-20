import { apiDelete, apiGet, apiPost, apiPut } from '../api';
import type { LastRegistrationData, Player, PlayerListItem, PlayerRole, StaffMember } from '../types';
import { epoch, type LastRegistrationDto, type PlayerDto, type PlayerListItemDto, type StaffMemberDto } from './dtos';

export function toPlayer(dto: PlayerDto): Player {
	return {
		...dto,
		lastPlayedTournamentTimestamp: dto.lastPlayedTournamentTimestamp
			? epoch(dto.lastPlayedTournamentTimestamp)
			: undefined,
		avatar: dto.avatar ?? undefined,
	};
}

export function toPlayerListItem(dto: PlayerListItemDto): PlayerListItem {
	return {
		...dto,
		lastPlayedTournamentTimestamp: dto.lastPlayedTournamentTimestamp
			? epoch(dto.lastPlayedTournamentTimestamp)
			: undefined,
		avatar: dto.avatar ?? undefined,
	};
}

// uids: batch-resolve a known set of players (e.g. a tournament's registrants); omit for the
// whole roster. Always the lean PlayerListItem shape — use getPlayer for a full single Player.
export async function listPlayers(uids?: string[]): Promise<PlayerListItem[]> {
	const query = uids?.length ? `?uids=${uids.map(encodeURIComponent).join(',')}` : '';
	return (await apiGet<PlayerListItemDto[]>(`/api/players${query}`)).map(toPlayerListItem);
}

export async function getPlayer(uid: string): Promise<Player | null> {
	try {
		return toPlayer(await apiGet<PlayerDto>(`/api/players/${uid}`));
	} catch {
		return null;
	}
}

// The signed-in user's most recent solo registration, for the register page's prefill button.
export async function getMyLastRegistration(): Promise<LastRegistrationData | null> {
	return (await apiGet<LastRegistrationDto | undefined>('/api/players/me/last-registration')) ?? null;
}

export async function addPlayer(name: string): Promise<Player> {
	const trimmed = name.trim();
	return toPlayer(await apiPost<PlayerDto>('/api/players', { uid: trimmed, name: trimmed }));
}

export async function deletePlayer(uid: string): Promise<void> {
	await apiDelete(`/api/players/${uid}`);
}

export async function updatePlayerElo(uid: string, elo: number): Promise<Player> {
	return toPlayer(await apiPut<PlayerDto>(`/api/players/${uid}/elo`, { elo }));
}

export async function updateProfile(uid: string, name: string): Promise<Player> {
	return toPlayer(await apiPut<PlayerDto>(`/api/players/${uid}/name`, { name }));
}

export async function updateAvatar(uid: string, avatar: string): Promise<Player> {
	return toPlayer(await apiPut<PlayerDto>(`/api/players/${uid}/avatar`, { avatar }));
}

// Admin-only: every moderator and admin, highest role first.
export async function listStaff(): Promise<StaffMember[]> {
	return (await apiGet<StaffMemberDto[]>('/api/players/staff')).map((dto) => ({
		...dto,
		avatar: dto.avatar ?? undefined,
	}));
}

// Admin-only: the API accepts only player <-> moderator changes (admins can't be changed).
export async function setPlayerRole(uid: string, role: PlayerRole): Promise<Player> {
	return toPlayer(await apiPut<PlayerDto>(`/api/players/${uid}/role`, { role }));
}
