import { redirect, fail } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { db } from '$lib/server/db';
import { createHousehold, listForUser, MembershipError, requireMembership } from '$lib/server/households';
import type { PageServerLoad, Actions } from './$types';

const HOUSEHOLD_COOKIE = 'gm_household';

function setHouseholdCookie(cookies: import('@sveltejs/kit').Cookies, id: string) {
	cookies.set(HOUSEHOLD_COOKIE, id, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev
	});
}

export const load: PageServerLoad = async ({ locals }) => {
	// locals.user is guaranteed by the (app) layout gate
	const households = listForUser(db, locals.user!.id);
	return { households };
};

export const actions: Actions = {
	create: async ({ request, cookies, locals }) => {
		const data = await request.formData();
		const name = (data.get('name') as string | null)?.trim() ?? '';

		if (!name) {
			return fail(400, { message: 'Le nom du foyer est requis' });
		}

		const household = createHousehold(db, { name, ownerId: locals.user!.id });
		setHouseholdCookie(cookies, household.id);
		redirect(303, '/households');
	},

	switch: async ({ request, cookies, locals }) => {
		const data = await request.formData();
		const householdId = (data.get('householdId') as string | null) ?? '';

		if (!householdId) {
			return fail(400, { message: 'Foyer invalide' });
		}

		try {
			requireMembership(db, householdId, locals.user!.id);
		} catch (e) {
			if (e instanceof MembershipError) {
				return fail(400, { message: 'Vous n\'êtes pas membre de ce foyer' });
			}
			throw e;
		}

		setHouseholdCookie(cookies, householdId);
		const referer = request.headers.get('referer') ?? '/households';
		redirect(303, referer);
	}
};
