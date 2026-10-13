import { redirect } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.js';
import { invalidateSession } from '#lib/server/auth/session.js';
import { clearSessionCookie } from '#lib/server/auth/cookies.js';

export const POST = async ({ locals, cookies }) => {
	if (locals.session) invalidateSession(db, locals.session.id);
	clearSessionCookie(cookies);
	throw redirect(303, '/login');
};
