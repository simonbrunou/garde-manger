import { redirect, fail } from '@sveltejs/kit';
import * as v from 'valibot';
import { eq } from 'drizzle-orm';
import { db, users } from '$lib/server/db';
import { listCredentials, deleteCredential } from '$lib/server/auth/webauthn';
import { m } from '$lib/i18n';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const credentials = listCredentials(db, user.id);
	return { user, credentials };
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
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
	}
};
