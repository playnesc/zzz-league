import type { PlayerListItem } from "./types";

// Which site-wide popups are open; rendered by the root layout, opened/closed via uiCommon.
// Unlike AuthSession this is a plain module-level singleton: it's only ever changed by clicks in
// the browser and the server always renders everything closed, so sharing it across server
// requests is harmless.
export const popups = $state({
	loginOpen: false,
	settingsOpen: false,
	profileUser: null as PlayerListItem | null,
	viewingImage: "",
	// Nexus result id shown large in NexusViewerPopup ("" = closed).
	viewingNexusResult: "",
});
