// Two pre-resized tiers (see scripts/resize-avatars.mjs) instead of the ~283x307 masters —
// `src` (96px) covers every small icon-ish usage, `srcLarge` (192px) the couple of full-size
// avatar displays (profile popup, settings). Never import the masters directly into a component.
const smallModules = import.meta.glob<{ default: string }>(
	'./assets/agents/sm/*.webp',
	{ eager: true },
);
const largeModules = import.meta.glob<{ default: string }>(
	'./assets/agents/lg/*.webp',
	{ eager: true },
);
// Pixel-exact 24px squares, one file per device-pixel-ratio (`<id>@<scale>x.webp`), for the
// Leaderboard's fixed-size avatars. `?no-inline` because they're all under Vite's 4KB inline
// limit and would otherwise be base64'd into the bundle — 300 of them.
const px24Modules = import.meta.glob<string>('./assets/agents/px24/*.webp', {
	eager: true,
	query: '?no-inline',
	import: 'default',
});

export interface FixedAvatar {
	src: string;
	srcset: string;
}

export interface AgentAvatar {
	id: string;
	name: string;
	src: string;
	srcLarge: string;
	/** 24px CSS, painted 1:1 at 100/125/150/175/200% display scale. */
	px24?: FixedAvatar;
}

function buildFixedAvatars(modules: Record<string, string>): Map<string, FixedAvatar> {
	const byId = new Map<string, { scale: number; url: string }[]>();
	for (const [path, url] of Object.entries(modules)) {
		const match = path.match(/([^/]+)@([\d.]+)x\.webp$/);
		if (!match) continue;
		const [, id, scale] = match;
		if (!byId.has(id)) byId.set(id, []);
		byId.get(id)!.push({ scale: Number(scale), url });
	}
	const result = new Map<string, FixedAvatar>();
	for (const [id, variants] of byId) {
		variants.sort((a, b) => a.scale - b.scale);
		result.set(id, {
			src: variants[0].url,
			srcset: variants.map((v) => `${v.url} ${v.scale}x`).join(', '),
		});
	}
	return result;
}

const px24ById = buildFixedAvatars(px24Modules);

const nameOverrides: Record<string, string> = {
	'orphie-magnusson-magus': 'Orphie & Magus',
};

function toDisplayName(id: string): string {
	if (nameOverrides[id]) return nameOverrides[id];
	return id
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

export const agentAvatars: AgentAvatar[] = Object.entries(smallModules)
	.map(([path, mod]) => {
		const id = path.split('/').pop()!.replace('.webp', '');
		const large = largeModules[`./assets/agents/lg/${id}.webp`];
		return {
			id,
			name: toDisplayName(id),
			src: mod.default,
			srcLarge: large?.default ?? mod.default,
			px24: px24ById.get(id),
		};
	})
	.sort((a, b) => a.name.localeCompare(b.name));

const avatarsById = new Map(agentAvatars.map((a) => [a.id, a]));

export function getAgentAvatar(id?: string | null): AgentAvatar | undefined {
	return id ? avatarsById.get(id) : undefined;
}
