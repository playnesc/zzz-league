import { createContext } from "svelte";
import type { User } from "firebase/auth";
import { resolve } from "$app/paths";
import type { Player, PlayerRole } from "./types";
import { hasRole } from "./roles";
import { getPlayer } from "./backend";

// What the root layout's load hands to the AuthSession it creates.
export interface SessionData {
	user: Player | null;
	ready: boolean;
	// The server session cookie expires soon; the browser should trade in a fresh Firebase ID token.
	renew?: boolean;
}

// The signed-in user, per render. Created by the root layout from its `data` and shared through
// context — never a module-level singleton, because on the server a module is shared by every
// request, so a global written during one request would leak that user into the next one.
//
// The server seeds it from the session cookie (see $lib/server/session); in the browser, Firebase
// stays the source of truth and syncFirebaseUser() keeps the cookie in line with it.
export class AuthSession {
	user = $state<Player | null>(null);
	// False until we know whether there's a session and `user` is settled. Until then
	// `user === null` means "don't know yet", not "logged out". The server normally settles it;
	// it stays false only when the server couldn't check (API unreachable), and then the browser
	// settles it. Gate logged-out and no-permission UI on this so signed-in users don't see it flash.
	ready = $state(false);
	role = $derived<PlayerRole>(this.user?.role ?? "player");
	isAdmin = $derived(hasRole(this.role, "admin"));
	isModerator = $derived(hasRole(this.role, "moderator"));

	private renewPending: boolean;

	constructor(init: SessionData) {
		this.user = init.user;
		this.ready = init.ready;
		this.renewPending = init.renew ?? false;
	}

	setUser(player: Player | null): void {
		this.user = player;
		this.ready = true;
	}

	async refresh(uid: string): Promise<void> {
		this.setUser(await getPlayer(uid));
	}

	// Called with every Firebase auth state change. Brings the server session cookie in line with
	// Firebase: starts one on login (or for a Firebase session the server didn't know about),
	// renews it when it's close to expiring, and ends it on logout.
	async syncFirebaseUser(firebaseUser: User | null): Promise<void> {
		if (!firebaseUser) {
			// A cookie can only exist if the server resolved a user or couldn't check.
			if (this.user || !this.ready) {
				await fetch(resolve("/auth/session"), { method: "DELETE" }).catch(() => {});
			}
			this.setUser(null);
			return;
		}

		if (this.user?.uid === firebaseUser.uid && !this.renewPending) {
			this.ready = true;
			return;
		}

		this.renewPending = false;
		try {
			const response = await fetch(resolve("/auth/session"), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idToken: await firebaseUser.getIdToken() }),
			});
			if (response.ok) {
				this.setUser((await response.json()) as Player);
				return;
			}
		} catch {
			// Fall through: no server session this time, but the browser session still works.
		}
		await this.refresh(firebaseUser.uid);
	}

	// Applies an already-fetched updated Player (from a mutation response) if it's the logged-in
	// user — avoids re-fetching data the mutation's response already gave us.
	applyPlayerUpdate(updated: Player): void {
		if (this.user?.uid === updated.uid) {
			this.user = updated;
		}
	}
}

export const [getAuthSession, setAuthSession] = createContext<AuthSession>();
