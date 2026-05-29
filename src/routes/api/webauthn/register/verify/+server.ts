import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, users } from '$lib/server/db';
import { verifyRegistration } from '$lib/server/auth/webauthn';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, cookies, request }) => {
	if (!locals.user) {
		error(401, 'Authentification requise');
	}

	const chal = cookies.get('gm_wa_chal');
	if (!chal) {
		error(400, 'Challenge manquant ou expiré');
	}

	const user = db.select().from(users).where(eq(users.id, locals.user.id)).get();
	if (!user) {
		error(401, 'Utilisateur introuvable');
	}

	const body = await request.json();

	const { verified } = await verifyRegistration(db, {
		user,
		response: body,
		expectedChallenge: chal,
		deviceLabel: body.deviceLabel ?? 'Passkey'
	});

	// Single-use: delete the challenge cookie regardless of outcome
	cookies.delete('gm_wa_chal', { path: '/' });

	if (!verified) {
		error(400, 'Vérification échouée');
	}

	return json({ verified });
};
