export const TOURNAMENT_STATE = {
	REGISTRATION: "registration",
	REGISTRATION_CLOSED: "registration_closed",
	BRACKET_CREATED: "bracket_created",
	STARTED: "started",
	AWAITING_REVIEW: "awaiting_review",
	COMPLETE: "complete",
} as const;

export function isRegistrationOpen(state: string | undefined): boolean {
	return !state || state === TOURNAMENT_STATE.REGISTRATION;
}

export function isRegistrationWindowOpen(
	state: string | undefined,
	registrationStartDate: number,
	registrationEndDate: number,
	now: number,
): boolean {
	return (
		isRegistrationOpen(state) &&
		now > registrationStartDate &&
		now < registrationEndDate
	);
}

export function isRegistrationClosed(state: string | undefined): boolean {
	return state === TOURNAMENT_STATE.REGISTRATION_CLOSED;
}

export function isBracketCreated(state: string | undefined): boolean {
	return state === TOURNAMENT_STATE.BRACKET_CREATED;
}

export function hasTournamentStarted(state: string | undefined): boolean {
	return (
		state === TOURNAMENT_STATE.STARTED ||
		state === TOURNAMENT_STATE.AWAITING_REVIEW ||
		state === TOURNAMENT_STATE.COMPLETE
	);
}

// One status per tournament for the card and the detail page. `upcoming` is a tournament whose
// registration window hasn't opened yet.
export type TournamentStatus =
	| "upcoming"
	| "registration"
	| "registration_closed"
	| "bracket_created"
	| "ongoing"
	| "complete";

export type StatusTone = "success" | "info" | "gold" | "neutral";

export const STATUS_TONE: Record<TournamentStatus, StatusTone> = {
	upcoming: "info",
	registration: "success",
	registration_closed: "info",
	bracket_created: "info",
	ongoing: "gold",
	complete: "neutral",
};

export function getTournamentStatus(
	t: { state?: string; registrationStartDate: number; registrationEndDate: number },
	now: number,
): TournamentStatus {
	switch (t.state) {
		case TOURNAMENT_STATE.COMPLETE:
			return "complete";
		case TOURNAMENT_STATE.STARTED:
		case TOURNAMENT_STATE.AWAITING_REVIEW:
			return "ongoing";
		case TOURNAMENT_STATE.BRACKET_CREATED:
			return "bracket_created";
		case TOURNAMENT_STATE.REGISTRATION_CLOSED:
			return "registration_closed";
	}
	if (now < t.registrationStartDate) return "upcoming";
	if (now < t.registrationEndDate) return "registration";
	return "registration_closed";
}

export function isLocked(state: string | undefined): boolean {
	return isBracketCreated(state) || hasTournamentStarted(state);
}

// Numeric tier encoding used to gate tournament min/maxTier eligibility (UI-only — this decides
// whether to show the "Register" button, not whether registration is actually accepted). Mirrors
// the backend's authoritative TournamentRegistrationService.EnsureTierEligible; a mismatch here
// would only affect button visibility since the backend independently re-validates on the real
// registration call.
export function playerTierValue(player: { isMidConfirmed: boolean; isHighConfirmed: boolean }): number {
	return player.isHighConfirmed ? 1000 : player.isMidConfirmed ? 100 : 0;
}
