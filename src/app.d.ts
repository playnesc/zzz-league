// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { SupportedLocale } from "$lib/i18n";

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			locale: SupportedLocale;
			// Raw session cookie (see $lib/server/session); unverified until the API accepts it.
			sessionToken: string | null;
		}
		interface PageData {
			// Rendered into <title> by the root layout.
			title?: string;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export { };
