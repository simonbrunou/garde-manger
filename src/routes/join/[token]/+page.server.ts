import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { db } from '$lib/server/db';
import { InvitationError, acceptInvitation } from '$lib/server/invitations';
import { m } from '$lib/i18n';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, cookies }) => {
	if (!locals.user) {
		redirect(303, `/login?redirectTo=${encodeURIComponent('/join/' + params.token)}`);
	}

	const t = m(locals.locale);

	const ERROR_MESSAGES: Record<string, string> = {
		not_found: t.join_error_not_found,
		already_used: t.join_error_already_used,
		expired: t.join_error_expired
	};

	try {
		const membership = acceptInvitation(db, {
			token: params.token,
			userId: locals.user.id
		});

		// Set the active household cookie so the user lands in the right household
		cookies.set('gm_household', membership.householdId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev
		});

		redirect(303, `/households/${membership.householdId}`);
	} catch (e) {
		if (e instanceof InvitationError) {
			return {
				locale: locals.locale as 'fr' | 'en',
				error: ERROR_MESSAGES[e.code] ?? t.join_error_generic
			};
		}
		// Let SvelteKit redirect/error throws propagate
		throw e;
	}
};
