import type { Handle } from "@sveltejs/kit";
import { LOCALE_COOKIE, isSupportedLocale, localeFromAcceptLanguage } from "$lib/i18n";
import { SESSION_COOKIE } from "$lib/server/session";

export const handle: Handle = async ({ event, resolve }) => {
	const cookieLocale = event.cookies.get(LOCALE_COOKIE);
	const locale = isSupportedLocale(cookieLocale)
		? cookieLocale
		: localeFromAcceptLanguage(event.request.headers.get("accept-language"));
	event.locals.locale = locale;
	// Only read here; resolving it to a user costs an API call, so that happens in the root
	// layout load, which runs just for page loads.
	event.locals.sessionToken = event.cookies.get(SESSION_COOKIE) ?? null;

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace("%lang%", locale),
	});
};
