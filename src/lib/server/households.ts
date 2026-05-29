import { eq, and } from 'drizzle-orm';
import type { DB } from './db/client';
import { households, memberships } from './db/schema';

export class MembershipError extends Error {
	code: 'not_member' | 'forbidden';
	constructor(code: 'not_member' | 'forbidden') {
		super(code === 'not_member' ? 'Not a member of this household' : 'Insufficient role');
		this.code = code;
		this.name = 'MembershipError';
	}
}

export function createHousehold(db: DB, { name, ownerId }: { name: string; ownerId: string }) {
	return db.transaction((tx) => {
		const now = new Date();
		const household = {
			id: crypto.randomUUID(),
			name,
			warnDays: 3,
			createdAt: now
		};
		tx.insert(households).values(household).run();

		tx.insert(memberships)
			.values({
				id: crypto.randomUUID(),
				householdId: household.id,
				userId: ownerId,
				role: 'admin',
				joinedAt: now
			})
			.run();

		return household;
	});
}

export function listForUser(db: DB, userId: string) {
	const rows = db
		.select({
			id: households.id,
			name: households.name,
			warnDays: households.warnDays,
			createdAt: households.createdAt,
			role: memberships.role
		})
		.from(memberships)
		.innerJoin(households, eq(memberships.householdId, households.id))
		.where(eq(memberships.userId, userId))
		.all();

	return rows;
}

export function requireMembership(
	db: DB,
	householdId: string,
	userId: string,
	role?: 'admin' | 'member'
) {
	const membership = db
		.select()
		.from(memberships)
		.where(and(eq(memberships.householdId, householdId), eq(memberships.userId, userId)))
		.get();

	if (!membership) {
		throw new MembershipError('not_member');
	}

	if (role === 'admin' && membership.role !== 'admin') {
		throw new MembershipError('forbidden');
	}

	return membership;
}
