import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { dev } from '$app/environment';
import { db, households, memberships, users } from '$lib/server/db';
import {
	MembershipError,
	requireMembership,
	listForUser,
	HouseholdError,
	updateHousehold,
	deleteHousehold,
	setMemberRole,
	removeMember
} from '$lib/server/households';
import { listPendingInvitations, revokeInvitation, InvitationError } from '$lib/server/invitations';
import { m } from '$lib/i18n';
import type { Actions, PageServerLoad } from './$types';

const HOUSEHOLD_COOKIE = 'gm_household';

function setHouseholdCookie(cookies: import('@sveltejs/kit').Cookies, id: string) {
	cookies.set(HOUSEHOLD_COOKIE, id, { path: '/', httpOnly: true, sameSite: 'lax', secure: !dev });
}

function fixActiveHousehold(cookies: import('@sveltejs/kit').Cookies, userId: string) {
	const remaining = listForUser(db, userId);
	if (remaining.length > 0) setHouseholdCookie(cookies, remaining[0].id);
	else cookies.delete(HOUSEHOLD_COOKIE, { path: '/' });
}

// Returns an ActionFailure to be `return`ed by the caller when the user is not an
// admin, or null when authorized. (SvelteKit forbids `throw fail()` — it must be returned.)
function ensureAdmin(id: string, userId: string, t: ReturnType<typeof m>) {
	try {
		requireMembership(db, id, userId, 'admin');
		return null;
	} catch (e) {
		if (e instanceof MembershipError) return fail(403, { message: t.manage_forbidden });
		throw e;
	}
}

export const load: PageServerLoad = async ({ params, locals }) => {
	let membership: ReturnType<typeof requireMembership>;
	try {
		membership = requireMembership(db, params.id, locals.user!.id);
	} catch (e) {
		if (e instanceof MembershipError) error(403, 'Accès refusé');
		throw e;
	}

	const household = db.select().from(households).where(eq(households.id, params.id)).get();
	if (!household) error(404, 'Foyer introuvable');

	const members = db
		.select({
			id: users.id,
			displayName: users.displayName,
			email: users.email,
			role: memberships.role,
			joinedAt: memberships.joinedAt
		})
		.from(memberships)
		.innerJoin(users, eq(memberships.userId, users.id))
		.where(eq(memberships.householdId, params.id))
		.all();

	const isAdmin = membership.role === 'admin';
	const pendingInvitations = isAdmin ? listPendingInvitations(db, params.id, new Date()) : [];

	return { household, members, isAdmin, currentUserId: locals.user!.id, pendingInvitations };
};

export const actions: Actions = {
	updateSettings: async ({ params, locals, request }) => {
		const t = m(locals.locale);
		const denied = ensureAdmin(params.id, locals.user!.id, t);
		if (denied) return denied;
		const data = await request.formData();
		const name = (data.get('name') as string | null) ?? '';
		const warnDays = Number((data.get('warnDays') as string | null) ?? '');
		try {
			updateHousehold(db, params.id, { name, warnDays });
		} catch (e) {
			if (e instanceof HouseholdError) return fail(400, { message: t.manage_settings_invalid });
			throw e;
		}
		return { settingsSaved: true };
	},

	setRole: async ({ params, locals, request }) => {
		const t = m(locals.locale);
		const denied = ensureAdmin(params.id, locals.user!.id, t);
		if (denied) return denied;
		const data = await request.formData();
		const userId = (data.get('userId') as string | null) ?? '';
		const role: 'admin' | 'member' = data.get('role') === 'admin' ? 'admin' : 'member';
		try {
			setMemberRole(db, params.id, userId, role);
		} catch (e) {
			if (e instanceof HouseholdError) {
				return fail(400, {
					message: e.code === 'last_admin' ? t.manage_last_admin : t.manage_member_not_found
				});
			}
			throw e;
		}
		redirect(303, `/households/${params.id}`);
	},

	removeMember: async ({ params, locals, request, cookies }) => {
		const t = m(locals.locale);
		const denied = ensureAdmin(params.id, locals.user!.id, t);
		if (denied) return denied;
		const data = await request.formData();
		const userId = (data.get('userId') as string | null) ?? '';
		try {
			removeMember(db, params.id, userId);
		} catch (e) {
			if (e instanceof HouseholdError) {
				return fail(400, {
					message: e.code === 'last_admin' ? t.manage_last_admin : t.manage_member_not_found
				});
			}
			throw e;
		}
		if (userId === locals.user!.id) {
			if (cookies.get(HOUSEHOLD_COOKIE) === params.id) fixActiveHousehold(cookies, locals.user!.id);
			redirect(303, '/households');
		}
		redirect(303, `/households/${params.id}`);
	},

	revokeInvitation: async ({ params, locals, request }) => {
		const t = m(locals.locale);
		const denied = ensureAdmin(params.id, locals.user!.id, t);
		if (denied) return denied;
		const data = await request.formData();
		const id = (data.get('id') as string | null) ?? '';
		try {
			revokeInvitation(db, id, params.id);
		} catch (e) {
			if (e instanceof InvitationError)
				return fail(400, { message: t.manage_invite_revoke_failed });
			throw e;
		}
		redirect(303, `/households/${params.id}`);
	},

	deleteHousehold: async ({ params, locals, request, cookies }) => {
		const t = m(locals.locale);
		const denied = ensureAdmin(params.id, locals.user!.id, t);
		if (denied) return denied;
		const household = db.select().from(households).where(eq(households.id, params.id)).get();
		if (!household) error(404, 'Foyer introuvable');
		const data = await request.formData();
		const confirmName = ((data.get('confirmName') as string | null) ?? '').trim();
		if (confirmName !== household.name) {
			return fail(400, { message: t.manage_delete_name_mismatch });
		}
		deleteHousehold(db, params.id);
		if (cookies.get(HOUSEHOLD_COOKIE) === params.id) fixActiveHousehold(cookies, locals.user!.id);
		redirect(303, '/households');
	}
};
