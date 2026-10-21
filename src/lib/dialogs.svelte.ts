// In-app replacements for window.alert / confirm / prompt. Rendered by DialogHost.svelte
// (mounted once in the root layout), so they match the site's styling and work in every locale.

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

// Module-level rather than per-request: only ever set from the browser, so the server always
// renders it empty.
export const dialogs = $state<{ active: DialogRequest | null; toasts: Toast[] }>({
	active: null,
	toasts: [],
});

export function confirmDialog(message: string, options: ConfirmOptions = {}): Promise<boolean> {
	return new Promise((resolve) => {
		dialogs.active = { kind: "confirm", message, resolve, ...options };
	});
}

export function promptDialog(message: string, options: PromptOptions = {}): Promise<string | null> {
	return new Promise((resolve) => {
		dialogs.active = { kind: "prompt", message, resolve, ...options };
	});
}

let nextToastId = 1;

export function dismissToast(id: number) {
	dialogs.toasts = dialogs.toasts.filter((t) => t.id !== id);
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
	dialogs.toasts = [...dialogs.toasts.slice(-3), { id, kind, message }];
	setTimeout(() => dismissToast(id), kind === "error" ? 8000 : 5000);
}
