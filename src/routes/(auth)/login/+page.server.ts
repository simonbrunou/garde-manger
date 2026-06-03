import { redirect, fail } from '@sveltejs/kit';
import * as v from 'valibot';
import { eq } from 'drizzle-orm';
import { db, users } from '$lib/server/db';
import { verifyPassword } from '$lib/server/auth/password';
import { createSession } from '$lib/server/auth/session';
import { setSessionCookie } from '$lib/server/auth/cookies';
import { loginSchema, safeLocalPath } from '$lib/validation';
import { m } from '$lib/i18n';
import { loginAttemptLimiter } from '$lib/server/auth/rateLimit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const redirectTo = safeLocalPath(url.searchParams.get('redirectTo'), '/garde-manger');
	if (locals.user) redirect(303, redirectTo);
	return { redirectTo };
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		const t = m(locals.locale);
		const raw = Object.fromEntries(await request.formData());
		const result = v.safeParse(loginSchema, raw);
		if (!result.success) {
			return fail(400, { message: t.auth_invalid_credentials });
		}

		const { email: rawEmail, password } = result.output;
		const email = rawEmail.toLowerCase();

		if (loginAttemptLimiter.isLimited(email, new Date())) {
			return fail(429, { message: t.auth_rate_limited });
		}

		const user = db.select().from(users).where(eq(users.email, email)).get();
		if (!user || !user.passwordHash) {
			loginAttemptLimiter.record(email, new Date());
			return fail(400, { message: t.auth_invalid_credentials });
		}

		const valid = await verifyPassword(password, user.passwordHash);
		if (!valid) {
			loginAttemptLimiter.record(email, new Date());
			return fail(400, { message: t.auth_invalid_credentials });
		}

		const { token, session } = await createSession(db, user.id);
		setSessionCookie(cookies, token, session.expiresAt);
		loginAttemptLimiter.reset(email);

		const redirectTo = safeLocalPath(raw.redirectTo as string, '/garde-manger');
		redirect(303, redirectTo);
	}
};
