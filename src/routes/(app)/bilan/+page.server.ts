import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { requireMembership, MembershipError } from '$lib/server/households';
import { householdStats } from '$lib/server/stats';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies, parent }) => {
	const { locale } = await parent();
	const hh = cookies.get('gm_household') ?? null;
	if (!hh) return { noHousehold: true as const, locale };
	try {
		requireMembership(db, hh, locals.user!.id);
	} catch (e) {
		if (e instanceof MembershipError) error(403, 'Forbidden');
		throw e;
	}
	return { noHousehold: false as const, locale, stats: householdStats(db, hh, new Date()) };
};
