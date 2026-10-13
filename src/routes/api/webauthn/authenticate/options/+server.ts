import { json } from '@sveltejs/kit';
import { dev } from '$app/env';
import { db } from '#lib/server/db/index.js';
import { authenticationOptions } from '#lib/server/auth/webauthn.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	const options = await authenticationOptions(db);

	cookies.set('gm_wa_auth_chal', options.challenge, {
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		path: '/',
		maxAge: 300
	});

	return json(options);
};
