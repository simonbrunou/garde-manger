import { redirect, fail } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { db } from '$lib/server/db';
import { InvitationError, acceptInvitation, previewInvitation } from '$lib/server/invitations';
import { m, type Messages } from '$lib/i18n';
import type { Actions, PageServerLoad } from './$types';

function joinErrorMessage(t: Messages, code: string): string {
	const map: Record<string, string> = {
		not_found: t.join_error_not_found,
		already_used: t.join_error_already_used,
		expired: t.join_error_expired
	};
	return map[code] ?? t.join_error_generic;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		redirect(303, `/login?redirectTo=${encodeURIComponent('/join/' + params.token)}`);
	}

	const t = m(locals.locale);
	const locale = locals.locale as 'fr' | 'en';

	try {
		// Read-only: validates and fetches the household name WITHOUT consuming the
		// token. Acceptance happens in the POST action below.
		const preview = previewInvitation(db, params.token);
		return { locale, householdName: preview.householdName };
	} catch (e) {
		if (e instanceof InvitationError) {
			return { locale, error: joinErrorMessage(t, e.code) };
		}
		throw e;
	}
};

export const actions: Actions = {
	// Acceptance is a POST (CSRF-protected by SvelteKit) so the single-use token
	// cannot be burned by a link prefetch or forced via a cross-site GET.
	default: async ({ params, locals, cookies }) => {
		if (!locals.user) {
			redirect(303, `/login?redirectTo=${encodeURIComponent('/join/' + params.token)}`);
		}

		const t = m(locals.locale);

		let householdId: string;
		try {
			const membership = acceptInvitation(db, { token: params.token, userId: locals.user.id });
			householdId = membership.householdId;
		} catch (e) {
			if (e instanceof InvitationError) {
				return fail(400, { error: joinErrorMessage(t, e.code) });
			}
			throw e;
		}

		// Set the active household cookie so the user lands in the right household.
		cookies.set('gm_household', householdId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev
		});

		redirect(303, `/households/${householdId}`);
	}
};
