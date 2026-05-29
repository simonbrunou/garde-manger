import { redirect, fail } from '@sveltejs/kit';
import * as v from 'valibot';
import { eq } from 'drizzle-orm';
import { db, users } from '$lib/server/db';
import { hashPassword } from '$lib/server/auth/password';
import { createSession } from '$lib/server/auth/session';
import { setSessionCookie } from '$lib/server/auth/cookies';
import { signupSchema, safeLocalPath } from '$lib/validation';
import { m } from '$lib/i18n';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const redirectTo = safeLocalPath(url.searchParams.get('redirectTo'));
	if (locals.user) redirect(303, redirectTo);
	return { redirectTo };
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		const t = m(locals.locale);
		const raw = Object.fromEntries(await request.formData());
		const result = v.safeParse(signupSchema, raw);
		if (!result.success) {
			const message = result.issues[0].message;
			return fail(400, {
				message,
				email: raw.email as string,
				displayName: raw.displayName as string
			});
		}

		const { email: rawEmail, displayName, password, locale } = result.output;
		const email = rawEmail.toLowerCase();

		const existing = db.select().from(users).where(eq(users.email, email)).get();
		if (existing) {
			return fail(400, {
				message: t.auth_email_already_used,
				email,
				displayName
			});
		}

		const passwordHash = await hashPassword(password);
		const id = crypto.randomUUID();
		db.insert(users)
			.values({ id, email, displayName, locale, passwordHash, createdAt: new Date() })
			.run();

		const { token, session } = await createSession(db, id);
		setSessionCookie(cookies, token, session.expiresAt);

		const redirectTo = safeLocalPath(raw.redirectTo as string);
		redirect(303, redirectTo);
	}
};
