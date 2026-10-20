// In-app replacements for window.alert / confirm / prompt. Rendered by DialogHost.svelte
// (mounted once in the root layout), so they match the site's styling and work in every locale.
import { writable } from "svelte/store";

export type ConfirmOptions = {
	title?: string;
	confirmLabel?: string;
	/** Styles the confirm button as destructive. */
	danger?: boolean;
};

export type PromptOptions = {
	title?: string;
	confirmLabel?: string;
	defaultValue?: string;
	inputType?: "text" | "number";
};

export type DialogRequest =
	| ({ kind: "confirm"; message: string; resolve: (ok: boolean) => void } & ConfirmOptions)
	| ({ kind: "prompt"; message: string; resolve: (value: string | null) => void } & PromptOptions);

export type ToastKind = "error" | "success" | "info";
/** `message: null` renders the translated "something went wrong" fallback. */
export type Toast = { id: number; kind: ToastKind; message: string | null };

export const activeDialog = writable<DialogRequest | null>(null);
export const toasts = writable<Toast[]>([]);

export function confirmDialog(message: string, options: ConfirmOptions = {}): Promise<boolean> {
	return new Promise((resolve) => {
		activeDialog.set({ kind: "confirm", message, resolve, ...options });
	});
}

export function promptDialog(message: string, options: PromptOptions = {}): Promise<string | null> {
	return new Promise((resolve) => {
		activeDialog.set({ kind: "prompt", message, resolve, ...options });
	});
}

let nextToastId = 1;

export function dismissToast(id: number) {
	toasts.update((list) => list.filter((t) => t.id !== id));
}

/** Readable text for anything thrown or passed around as an error; null when there's nothing useful. */
export function errorMessage(error: unknown): string | null {
	if (typeof error === "string") return error || null;
	if (error instanceof Error) return error.message || null;
	if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
		return error.message || null;
	}
	return null;
}

/** Shows a toast. Pass a string or a caught error. */
export function notify(messageOrError: unknown, kind: ToastKind = "error") {
	const message = errorMessage(messageOrError);
	const id = nextToastId++;
	toasts.update((list) => [...list.slice(-3), { id, kind, message }]);
	setTimeout(() => dismissToast(id), kind === "error" ? 8000 : 5000);
}
