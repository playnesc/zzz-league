import type { Handle } from "@sveltejs/kit";
import { LOCALE_COOKIE, isSupportedLocale, localeFromAcceptLanguage } from "$lib/i18n";

export const handle: Handle = async ({ event, resolve }) => {
	const cookieLocale = event.cookies.get(LOCALE_COOKIE);
	const locale = isSupportedLocale(cookieLocale)
		? cookieLocale
		: localeFromAcceptLanguage(event.request.headers.get("accept-language"));
	event.locals.locale = locale;

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace("%lang%", locale),
	});
};
