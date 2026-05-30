import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { listForUser } from '$lib/server/households';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies, url }) => {
	if (!locals.user)
		redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);

	const user = locals.user;
	const households = listForUser(db, user.id);

	const cookieId = cookies.get('gm_household') ?? null;
	const householdIds = households.map((h) => h.id);
	const activeHouseholdId =
		cookieId && householdIds.includes(cookieId) ? cookieId : (households[0]?.id ?? null);

	return { user, households, activeHouseholdId, locale: locals.locale };
};
