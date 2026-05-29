import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { MembershipError, requireMembership } from '$lib/server/households';
import { createInvitation } from '$lib/server/invitations';
import { m } from '$lib/i18n';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const t = m(locals.locale);
	try {
		requireMembership(db, params.id, locals.user!.id, 'admin');
	} catch (e) {
		if (e instanceof MembershipError) {
			error(403, t.invite_admin_only);
		}
		throw e;
	}

	return { householdId: params.id };
};

export const actions: Actions = {
	create: async ({ params, locals, request, url }) => {
		const t = m(locals.locale);
		try {
			requireMembership(db, params.id, locals.user!.id, 'admin');
		} catch (e) {
			if (e instanceof MembershipError) {
				return fail(403, { message: t.invite_access_denied });
			}
			throw e;
		}

		const data = await request.formData();
		const rawRole = data.get('role');
		const role: 'admin' | 'member' = rawRole === 'admin' ? 'admin' : 'member';

		const { token } = createInvitation(db, {
			householdId: params.id,
			role,
			createdBy: locals.user!.id
		});

		// Build an absolute link using the request origin (token — not its hash — goes in the URL)
		const link = new URL(`/join/${token}`, url.origin).href;

		return { link };
	}
};
