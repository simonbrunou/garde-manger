import { redirect, fail } from '@sveltejs/kit';
import * as v from 'valibot';
import { eq } from 'drizzle-orm';
import { dev } from '$app/environment';
import { db, users } from '$lib/server/db';
import { listCredentials, deleteCredential } from '$lib/server/auth/webauthn';
import { vapidPublicKey } from '$lib/server/pushConfig';
import { m } from '$lib/i18n';
import { normalizeChoice, THEME_COOKIE } from '$lib/theme';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const user = locals.user!;
	const credentials = listCredentials(db, user.id);
	return {
		user,
		credentials,
		vapidPublicKey: vapidPublicKey(),
		theme: normalizeChoice(cookies.get(THEME_COOKIE))
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals, cookies }) => {
		const t = m(locals.locale);
		const profileSchema = v.object({
			displayName: v.pipe(
				v.string(),
				v.trim(),
				v.minLength(1, t.account_display_name_required),
				v.maxLength(80)
			),
			locale: v.optional(v.picklist(['fr', 'en']), 'fr')
		});
		const user = locals.user!;
		const raw = Object.fromEntries(await request.formData());
		const result = v.safeParse(profileSchema, raw);
		if (!result.success) {
			return fail(400, { message: result.issues[0].message });
		}
		const { displayName, locale } = result.output;
		db.update(users).set({ displayName, locale }).where(eq(users.id, user.id)).run();
		// Mirror locale to cookie so the change takes effect immediately on the next request
		// and persists as a fallback after logout.
		cookies.set('gm_locale', locale, {
			path: '/',
			httpOnly: false,
			sameSite: 'lax',
			secure: !dev,
			maxAge: 60 * 60 * 24 * 365
		});
		return { success: true };
	},

	removePasskey: async ({ request, locals }) => {
		const t = m(locals.locale);
		const user = locals.user!;
		const raw = Object.fromEntries(await request.formData());
		const id = typeof raw.id === 'string' ? raw.id.trim() : '';
		if (!id) {
			return fail(400, { message: t.account_passkey_id_missing });
		}
		deleteCredential(db, { id, userId: user.id });
		redirect(303, '/account');
	},

	setTheme: async ({ request, cookies }) => {
		const data = await request.formData();
		const theme = normalizeChoice(data.get('theme') as string | null);
		cookies.set(THEME_COOKIE, theme, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365
		});
		redirect(303, '/account');
	}
};
