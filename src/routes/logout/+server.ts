import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { invalidateSession } from '$lib/server/auth/session';
import { clearSessionCookie } from '$lib/server/auth/cookies';

export const POST = async ({ locals, cookies }) => {
	if (locals.session) invalidateSession(db, locals.session.id);
	clearSessionCookie(cookies);
	throw redirect(303, '/login');
};
