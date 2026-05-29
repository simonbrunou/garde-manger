import { json, error } from '@sveltejs/kit';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { db } from '$lib/server/db';
import { verifyAuthentication } from '$lib/server/auth/webauthn';
import { createSession } from '$lib/server/auth/session';
import { setSessionCookie } from '$lib/server/auth/cookies';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, request }) => {
	const chal = cookies.get('gm_wa_chal');
	if (!chal) {
		error(400, 'Challenge manquant ou expiré');
	}

	let body: AuthenticationResponseJSON;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON');
	}

	const result = await verifyAuthentication(db, {
		response: body,
		expectedChallenge: chal
	});

	// Single-use: delete the challenge cookie regardless of outcome
	cookies.delete('gm_wa_chal', { path: '/' });

	if (result.verified && result.userId) {
		const { token, session } = await createSession(db, result.userId);
		setSessionCookie(cookies, token, session.expiresAt);
		return json({ verified: true });
	}

	return json({ verified: false }, { status: 401 });
};
