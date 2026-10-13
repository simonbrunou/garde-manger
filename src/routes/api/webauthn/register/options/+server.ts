import { json, error } from '@sveltejs/kit';
import { dev } from '$app/env';
import { eq } from 'drizzle-orm';
import { db, users } from '#lib/server/db/index.js';
import { registrationOptions } from '#lib/server/auth/webauthn.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	if (!locals.user) {
		error(401, 'Authentification requise');
	}

	const user = db.select().from(users).where(eq(users.id, locals.user.id)).get();
	if (!user) {
		error(401, 'Utilisateur introuvable');
	}

	const options = await registrationOptions(db, user);

	cookies.set('gm_wa_reg_chal', options.challenge, {
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		path: '/',
		maxAge: 300
	});

	return json(options);
};
