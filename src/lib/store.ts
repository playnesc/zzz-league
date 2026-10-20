import { writable } from 'svelte/store'
import type { PlayerListItem, Tournament } from './types';
import { getSeasonTimer, getTournament, listTournaments } from './backend';

export const tournaments = writable<Tournament[]>([]);
// Distinguishes "not fetched yet" from "genuinely empty" for empty-state messages.
export const tournamentsLoaded = writable(false);

export const seasonTimerEndsAt = writable<number | null>(null);

export async function refreshSeasonTimer(): Promise<void> {
	seasonTimerEndsAt.set(await getSeasonTimer());
}

export const loginOpen = writable(false);
export const settingsOpen = writable(false);
export const profileUser = writable<PlayerListItem | null>(null);
export const viewingImage = writable<string>("");
// Nexus result id shown large in NexusViewerPopup ("" = closed).
export const viewingNexusResult = writable<string>("");

// ---- REST-backed data loading, replacing the old onValue-fed stores ----

export async function refreshTournaments(): Promise<void> {
	tournaments.set(await listTournaments());
	tournamentsLoaded.set(true);
}

// Called from the root layout on SignalR's list-group "TournamentChanged" push — upserts just the
// one affected tournament instead of refetching the whole list.
export async function refreshOneTournament(tournamentId: string): Promise<void> {
	const updated = await getTournament(tournamentId);
	tournaments.update(($tournaments) => {
		const index = $tournaments.findIndex((t) => t.id === tournamentId);
		if (!updated) {
			return index === -1 ? $tournaments : $tournaments.filter((t) => t.id !== tournamentId);
		}
		if (index === -1) return [...$tournaments, updated];
		const next = [...$tournaments];
		next[index] = updated;
		return next;
	});
}
