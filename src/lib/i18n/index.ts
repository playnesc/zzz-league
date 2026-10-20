import { addMessages, init, locale, _, isLoading, waitLocale } from "svelte-i18n";

import en from "./locales/en.json";
import uk from "./locales/uk.json";
import ru from "./locales/ru.json";

export const SUPPORTED_LOCALES = ["en", "ru", "uk"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
	en: "English",
	ru: "Русский",
	uk: "Українська",
};

// The chosen locale lives in a cookie so the server can render the page in it (see
// hooks.server.ts); visitors without one get their Accept-Language match, then English.
export const LOCALE_COOKIE = "locale";
// Pre-SSR builds kept the choice in localStorage — read once to carry it over to the cookie.
const LEGACY_STORAGE_KEY = "locale";
const DEFAULT_LOCALE: SupportedLocale = "en";

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
	return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

// Picks the best supported locale from an Accept-Language header (e.g. "uk-UA,uk;q=0.9,en;q=0.8").
export function localeFromAcceptLanguage(header: string | null): SupportedLocale {
	const ranked = (header ?? "")
		.split(",")
		.map((part) => {
			const [tag, ...params] = part.trim().split(";");
			const q = params.find((p) => p.trim().startsWith("q="));
			return { lang: tag.split("-")[0].toLowerCase(), q: q ? parseFloat(q.trim().slice(2)) : 1 };
		})
		.filter((entry) => entry.lang && !Number.isNaN(entry.q))
		.sort((a, b) => b.q - a.q);
	const match = ranked.find((entry) => isSupportedLocale(entry.lang))?.lang;
	return isSupportedLocale(match) ? match : DEFAULT_LOCALE;
}

addMessages("en", en);
addMessages("uk", uk);
addMessages("ru", ru);

// The root layout sets the real locale (from the server's pick) before anything renders.
init({
	fallbackLocale: DEFAULT_LOCALE,
	initialLocale: DEFAULT_LOCALE,
});

export function setLocale(next: SupportedLocale) {
	locale.set(next);
	if (typeof document !== "undefined") {
		document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
		document.documentElement.lang = next;
	}
}

// One-time carry-over of a locale chosen before the SSR switch: it only ever lived in
// localStorage, so the server couldn't see it and rendered the Accept-Language pick instead.
export function migrateLegacyLocale(): void {
	try {
		const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
		if (stored === null) return;
		localStorage.removeItem(LEGACY_STORAGE_KEY);
		const hasCookie = document.cookie.split("; ").some((c) => c.startsWith(`${LOCALE_COOKIE}=`));
		if (!hasCookie && isSupportedLocale(stored)) setLocale(stored);
	} catch {
		// localStorage unavailable — ignore
	}
}

export function formatDate(date: Date, options: Intl.DateTimeFormatOptions, currentLocale: string | null | undefined): string {
	return date.toLocaleString(currentLocale ?? DEFAULT_LOCALE, options);
}

export { locale, _, isLoading, waitLocale };
