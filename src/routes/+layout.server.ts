import { resolveSession } from "$lib/server/session";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals, cookies }) => ({
	locale: locals.locale,
	session: await resolveSession(locals.sessionToken, cookies),
});
