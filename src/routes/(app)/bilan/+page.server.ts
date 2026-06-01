import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { requireMembership, MembershipError } from '$lib/server/households';
import { householdStats } from '$lib/server/stats';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	// Use the layout's resolved active household (falls back to the user's first
	// household when the gm_household cookie isn't set) so Bilan agrees with Home
	// and Cuisiner instead of reading the raw cookie and wrongly showing "no household".
	const { locale, activeHouseholdId } = await parent();
	if (!activeHouseholdId) return { noHousehold: true as const, locale };
	try {
		requireMembership(db, activeHouseholdId, locals.user!.id);
	} catch (e) {
		if (e instanceof MembershipError) error(403, 'Forbidden');
		throw e;
	}
	return {
		noHousehold: false as const,
		locale,
		stats: householdStats(db, activeHouseholdId, new Date())
	};
};
