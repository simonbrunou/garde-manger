import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, households, memberships, users } from '$lib/server/db';
import { MembershipError, requireMembership } from '$lib/server/households';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	let membership: Awaited<ReturnType<typeof requireMembership>>;

	try {
		membership = requireMembership(db, params.id, locals.user!.id);
	} catch (e) {
		if (e instanceof MembershipError) {
			error(e.code === 'not_member' ? 403 : 403, 'Accès refusé');
		}
		throw e;
	}

	const household = db.select().from(households).where(eq(households.id, params.id)).get();

	if (!household) {
		error(404, 'Foyer introuvable');
	}

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

	return { household, members, isAdmin };
};
