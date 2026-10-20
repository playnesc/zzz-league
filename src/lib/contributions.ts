import { getContribution } from "./api/communityCosts";

export type { ContributionDetail, ContributionListItem, ContributionReview, ReviewComment } from "./api/communityCosts";
export { getContribution };

// 0 (red) -> 1 (green). Purely presentational — the actual 0..1 value comes precomputed from the
// server (see ContributionListItem.score / ContributionDetail.score).
export function contributionColor(score: number): string {
	const from = { r: 0xdc, g: 0x39, b: 0x39 };
	const to = { r: 0x2e, g: 0xa3, b: 0x4b };
	const r = Math.round(from.r + (to.r - from.r) * score);
	const g = Math.round(from.g + (to.g - from.g) * score);
	const b = Math.round(from.b + (to.b - from.b) * score);
	return `rgb(${r}, ${g}, ${b})`;
}
