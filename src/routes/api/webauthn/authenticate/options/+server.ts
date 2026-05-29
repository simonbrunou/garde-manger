import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { db } from '$lib/server/db';
import { authenticationOptions } from '$lib/server/auth/webauthn';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	const options = await authenticationOptions(db);

	cookies.set('gm_wa_chal', options.challenge, {
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		path: '/',
		maxAge: 300
	});

	return json(options);
};
