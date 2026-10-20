import { createContext } from "svelte";
import {
	addReviewComment as apiAddReviewComment,
	approveContribution as apiApproveContribution,
	createAgentContribution as apiCreateAgentContribution,
	createEngineContribution as apiCreateEngineContribution,
	listAgentCosts,
	listContributions,
	listEngineCosts,
	rejectContribution as apiRejectContribution,
	upsertReview as apiUpsertReview,
	type ContributionDetail,
	type ContributionListItem,
} from "./api/communityCosts";
import type { ReviewVote } from "./api/dtos";
import type { AgentCost } from "./costData";
import type { WeaponCost } from "./weaponData";

// The /costs page's data: community agent/engine costs and the contributions proposed against
// them. Created by that page and shared with its tables and popups through context, so it lives
// only as long as the page and is never shared between server requests.
export class CostsData {
	agentCosts = $state.raw<AgentCost[]>([]);
	weaponCosts = $state.raw<WeaponCost[]>([]);
	contributions = $state.raw<ContributionListItem[]>([]);
	// Distinguishes "not fetched yet" from "genuinely empty" for the review logs' empty states.
	contributionsLoaded = $state(false);

	async refreshAgentCosts(): Promise<void> {
		this.agentCosts = await listAgentCosts();
	}

	async refreshEngineCosts(): Promise<void> {
		this.weaponCosts = await listEngineCosts();
	}

	async refreshContributions(): Promise<void> {
		this.contributions = await listContributions();
		this.contributionsLoaded = true;
	}

	async createContribution(agentId: string, message: string, proposedCosts: number[]): Promise<ContributionDetail> {
		return this.upsert(await apiCreateAgentContribution(agentId, message, proposedCosts));
	}

	async createEngineContribution(
		engineId: string,
		overrideAgentId: string | undefined,
		message: string,
		proposedCosts: number[],
	): Promise<ContributionDetail> {
		return this.upsert(await apiCreateEngineContribution(engineId, overrideAgentId ?? null, message, proposedCosts));
	}

	async submitReview(contributionId: string, vote: ReviewVote, comment: string): Promise<ContributionDetail> {
		return this.upsert(await apiUpsertReview(contributionId, vote, comment));
	}

	async submitReviewComment(contributionId: string, reviewId: string, text: string): Promise<ContributionDetail> {
		return this.upsert(await apiAddReviewComment(contributionId, reviewId, text));
	}

	async approveContribution(id: string): Promise<ContributionDetail> {
		return this.upsert(await apiApproveContribution(id));
	}

	async rejectContribution(id: string): Promise<ContributionDetail> {
		return this.upsert(await apiRejectContribution(id));
	}

	// Detail responses carry everything a list item needs plus the full review list — drop the
	// reviews, keep the count, and patch the row in place so callers don't need a full re-fetch of
	// the list after every mutation.
	private upsert(detail: ContributionDetail): ContributionDetail {
		const { reviews, ...rest } = detail;
		const item: ContributionListItem = { ...rest, reviewCount: reviews.length };
		const index = this.contributions.findIndex((c) => c.id === item.id);
		if (index === -1) {
			this.contributions = [...this.contributions, item];
		} else {
			const next = [...this.contributions];
			next[index] = item;
			this.contributions = next;
		}
		return detail;
	}
}

export const [getCostsData, setCostsData] = createContext<CostsData>();
