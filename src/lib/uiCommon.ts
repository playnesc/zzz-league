import { browser } from "$app/environment";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { popups } from "./popups.svelte";
import type { PlayerListItem } from "./types";

marked.setOptions({ breaks: true });

export const dateDisplayOptions: Intl.DateTimeFormatOptions = {
	month: "short",
	day: "numeric",
	hour: "2-digit",
	minute: "2-digit",
};

export const bustCache = (url: string) =>
	url.startsWith("blob:") ? url : `${url}?t=${Date.now()}`;

export const MAX_IMAGE_SIZE_MB = 3;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export function isImageTooLarge(file: File): boolean {
	return file.size > MAX_IMAGE_SIZE_BYTES;
}

export async function pasteImageFromClipboard(): Promise<FileList | null> {
	const clipboardItems = await navigator.clipboard.read();
	for (const item of clipboardItems) {
		const imageType = item.types.find((t) => t.startsWith("image/"));
		if (!imageType) continue;
		const blob = await item.getType(imageType);
		const file = new File([blob], "pasted-image.png", { type: blob.type });
		return filesFromImageFile(file);
	}
	return null;
}

export function filesFromImageFile(file: File): FileList {
	const dataTransfer = new DataTransfer();
	dataTransfer.items.add(file);
	return dataTransfer.files;
}

export function imageFileFromPasteEvent(e: ClipboardEvent): File | null {
	const items = e.clipboardData?.items;
	if (!items) return null;
	for (const item of items) {
		if (item.type.startsWith("image/")) {
			return item.getAsFile();
		}
	}
	return null;
}

export function openProfilePopup(player: PlayerListItem) {
	popups.profileUser = player;
}

export function closeProfilePopup() {
	popups.profileUser = null;
}

export function openLoginPopup() {
	popups.loginOpen = true;
}

export function closeLoginPopup() {
	popups.loginOpen = false;
}

export function openSettingsPopup() {
	popups.settingsOpen = true;
}

export function closeSettingsPopup() {
	popups.settingsOpen = false;
}


export function openImagePopup(src: string) {
	popups.viewingImage = src;
}

export function closeImagePopup() {
	popups.viewingImage = "";
}

export function openNexusPopup(resultId: string) {
	popups.viewingNexusResult = resultId;
}

export function closeNexusPopup() {
	popups.viewingNexusResult = "";
}

// Tier values as stored on tournaments (minTier/maxTier). Tier names are league proper names
// and stay in English in every locale.
export const TIERS = [
	{ value: 0, cls: "t-newbie", name: "NEWBIE" },
	{ value: 100, cls: "t-mid", name: "MID TIER" },
	{ value: 1000, cls: "t-high", name: "HIGH TIER" },
] as const;

export function tierInfo(value: number): { cls: string; name: string } | undefined {
	return TIERS.find((t) => t.value === value);
}

export function getTier(p: { isMidConfirmed: boolean; isHighConfirmed: boolean }): { cls: string; name: string } {
	return tierInfo(p.isHighConfirmed ? 1000 : p.isMidConfirmed ? 100 : 0)!;
}

export function getLvl(elo: number): number {
	return Math.min(10, Math.floor(((elo || 1000) - 1000) / 40) + 1);
}

// DOMPurify needs a DOM, so this renders nothing during SSR. Every caller's markdown comes from
// client-fetched data or user input anyway, so the real render happens in the browser.
export function renderMarkdown(text: string): string {
	if (!browser) return "";
	const withUnderline = (text ?? "").replace(/__(.+?)__/g, "<u>$1</u>");
	const html = marked.parse(withUnderline, { async: false }) as string;
	return DOMPurify.sanitize(html);
}