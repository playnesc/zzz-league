import { createContext } from "svelte";
import type { Tournament } from "./types";
import { getSeasonTimer, getTournament, listTournaments } from "./backend";

// The tournament list and season timer, per render. Created by the root layout and shared through
// context like AuthSession rather than kept in a module-level singleton: the tournament list
// depends on the caller (hidden tournaments are only served to moderators/admins), so a global
// filled on the server could hand one user's list to the next request.
export class LeagueData {
	tournaments = $state.raw<Tournament[]>([]);
	// Distinguishes "not fetched yet" from "genuinely empty" for empty-state messages.
	tournamentsLoaded = $state(false);
	seasonTimerEndsAt = $state<number | null>(null);

	async refreshTournaments(): Promise<void> {
		this.tournaments = await listTournaments();
		this.tournamentsLoaded = true;
	}

	// Called from the root layout on SignalR's list-group "TournamentChanged" push — upserts just the
	// one affected tournament instead of refetching the whole list.
	async refreshOneTournament(tournamentId: string): Promise<void> {
		const updated = await getTournament(tournamentId);
		const index = this.tournaments.findIndex((t) => t.id === tournamentId);
		if (!updated) {
			if (index !== -1) this.tournaments = this.tournaments.filter((t) => t.id !== tournamentId);
			return;
		}
		if (index === -1) {
			this.tournaments = [...this.tournaments, updated];
			return;
		}
		const next = [...this.tournaments];
		next[index] = updated;
		this.tournaments = next;
	}

	async refreshSeasonTimer(): Promise<void> {
		this.seasonTimerEndsAt = await getSeasonTimer();
	}
}

export const [getLeagueData, setLeagueData] = createContext<LeagueData>();
