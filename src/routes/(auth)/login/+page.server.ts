import { redirect, fail } from '@sveltejs/kit';
import * as v from 'valibot';
import { eq } from 'drizzle-orm';
import { db, users } from '$lib/server/db';
import { verifyPassword } from '$lib/server/auth/password';
import { createSession } from '$lib/server/auth/session';
import { setSessionCookie } from '$lib/server/auth/cookies';
import { loginSchema, safeLocalPath } from '$lib/validation';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const redirectTo = safeLocalPath(url.searchParams.get('redirectTo'));
	if (locals.user) redirect(303, redirectTo);
	return { redirectTo };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const raw = Object.fromEntries(await request.formData());
		const result = v.safeParse(loginSchema, raw);
		if (!result.success) {
			return fail(400, { message: 'Identifiants invalides' });
		}

		const { email: rawEmail, password } = result.output;
		const email = rawEmail.toLowerCase();

		const user = db.select().from(users).where(eq(users.email, email)).get();
		if (!user || !user.passwordHash) {
			return fail(400, { message: 'Identifiants invalides' });
		}

		const valid = await verifyPassword(password, user.passwordHash);
		if (!valid) {
			return fail(400, { message: 'Identifiants invalides' });
		}

		const { token, session } = await createSession(db, user.id);
		setSessionCookie(cookies, token, session.expiresAt);

		const redirectTo = safeLocalPath(raw.redirectTo as string);
		redirect(303, redirectTo);
	}
};
