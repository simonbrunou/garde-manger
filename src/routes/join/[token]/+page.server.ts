import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { db } from '$lib/server/db';
import { InvitationError, acceptInvitation } from '$lib/server/invitations';
import type { PageServerLoad } from './$types';

const ERROR_MESSAGES: Record<string, string> = {
	not_found: "Ce lien d'invitation est invalide ou n'existe pas.",
	already_used: "Ce lien d'invitation a déjà été utilisé.",
	expired: "Ce lien d'invitation a expiré."
};

export const load: PageServerLoad = async ({ params, locals, cookies }) => {
	if (!locals.user) {
		redirect(303, `/login?redirectTo=${encodeURIComponent('/join/' + params.token)}`);
	}

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

		redirect(303, `/households/${membership.householdId}/members`);
	} catch (e) {
		if (e instanceof InvitationError) {
			return {
				error: ERROR_MESSAGES[e.code] ?? "Une erreur est survenue avec ce lien d'invitation."
			};
		}
		// Let SvelteKit redirect/error throws propagate
		throw e;
	}
};
