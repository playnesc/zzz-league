import { browser } from "$app/environment";
import type { TournamentDto } from "$lib/api/dtos";
import type { PageLoad } from "./$types";

export interface TournamentPreview {
	name: string;
	description: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5158";
const PREVIEW_DESCRIPTION_LENGTH = 200;

// Markdown (which may embed raw HTML) → one line of plain text for a meta description.
function toPlainText(markdown: string): string {
	return markdown
		.replace(/<[^>]*>/g, " ")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/[#>*_~`|]/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

function truncate(text: string, length: number): string {
	return text.length <= length ? text : `${text.slice(0, length - 1).trimEnd()}…`;
}

// Server-only: feeds the link-preview meta tags (Discord embeds, search engines) on a full page
// load, fetched anonymously so hidden tournaments never leak into a preview. Client-side
// navigations skip it — the page loads its own data with the viewer's auth (see +page.svelte).
// Uses Node's global fetch, not the load's: SvelteKit applies browser CORS rules to the latter
// even on the server, and the API only allows the public site's origin.
export const load: PageLoad = async ({ params }) => {
	if (browser) return { preview: null, title: undefined };

	try {
		const response = await fetch(`${API_BASE_URL}/api/tournaments/${params.id}`, {
			signal: AbortSignal.timeout(3000),
		});
		if (!response.ok) return { preview: null, title: undefined };
		const dto = (await response.json()) as TournamentDto;
		const preview: TournamentPreview = {
			name: dto.name,
			description: truncate(toPlainText(dto.description ?? ""), PREVIEW_DESCRIPTION_LENGTH),
		};
		return { preview, title: preview.name };
	} catch {
		return { preview: null, title: undefined };
	}
};
