import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { requireMembership, MembershipError } from '$lib/server/households';
import { normalizeBarcode } from '$lib/barcode';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals, url }) => {
	const { activeHouseholdId, locale } = await parent();

	if (!activeHouseholdId) {
		return { noHousehold: true as const, locale };
	}

	try {
		requireMembership(db, activeHouseholdId, locals.user!.id);
	} catch (e) {
		if (e instanceof MembershipError) {
			error(403, 'Forbidden');
		}
		throw e;
	}

	// No-JS manual fallback: GET /scan?code=… → redirect to the confirm page.
	const code = url.searchParams.get('code');
	if (code !== null) {
		const norm = normalizeBarcode(code);
		if (norm) {
			redirect(303, '/scan/' + norm);
		}
		return { noHousehold: false as const, locale, invalidCode: true };
	}

	return { noHousehold: false as const, locale, invalidCode: false };
};
