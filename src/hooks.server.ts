import type { Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { validateSessionToken } from '$lib/server/auth/session';
import { SESSION_COOKIE, clearSessionCookie } from '$lib/server/auth/cookies';
import { resolveLocale } from '$lib/i18n';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	if (token) {
		const result = validateSessionToken(db, token);
		if (result) {
			const { user, session } = result;
			event.locals.user = {
				id: user.id,
				email: user.email,
				displayName: user.displayName,
				locale: user.locale
			};
			event.locals.session = {
				id: session.id,
				userId: session.userId,
				expiresAt: session.expiresAt
			};
		} else {
			event.locals.user = null;
			event.locals.session = null;
			clearSessionCookie(event.cookies);
		}
	} else {
		event.locals.user = null;
		event.locals.session = null;
	}

	event.locals.locale = resolveLocale({
		userLocale: event.locals.user?.locale,
		cookie: event.cookies.get('gm_locale'),
		acceptLanguage: event.request.headers.get('accept-language')
	});

	const response = await resolve(event);

	// Security headers (the CSP itself is configured in svelte.config.js). HSTS is
	// intentionally left to the TLS-terminating proxy (Traefik/Coolify) so dev over
	// http:// and localhost are not forced onto HTTPS.
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');

	// Belt-and-suspenders: ensure the self-hosted ZXing WASM is served as
	// application/wasm (a mislabelled type breaks streaming instantiation under CSP).
	if (event.url.pathname.endsWith('.wasm') && !response.headers.get('content-type')) {
		response.headers.set('content-type', 'application/wasm');
	}

	return response;
};
