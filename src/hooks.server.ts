import type { Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { validateSessionToken } from '$lib/server/auth/session';
import { SESSION_COOKIE, clearSessionCookie } from '$lib/server/auth/cookies';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	if (token) {
		const result = validateSessionToken(db, token);
		if (result) {
			const { user, session } = result;
			event.locals.user = { id: user.id, email: user.email, displayName: user.displayName, locale: user.locale };
			event.locals.session = { id: session.id, userId: session.userId, expiresAt: session.expiresAt };
		} else {
			event.locals.user = null;
			event.locals.session = null;
			clearSessionCookie(event.cookies);
		}
	} else {
		event.locals.user = null;
		event.locals.session = null;
	}
	return resolve(event);
};
