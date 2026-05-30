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

export class HouseholdError extends Error {
	code: 'invalid' | 'not_found' | 'last_admin';
	constructor(code: 'invalid' | 'not_found' | 'last_admin') {
		const messages = {
			invalid: 'Invalid household data',
			not_found: 'Household or member not found',
			last_admin: 'A household must keep at least one admin'
		};
		super(messages[code]);
		this.code = code;
		this.name = 'HouseholdError';
	}
}

export function updateHousehold(
	db: DB,
	householdId: string,
	patch: { name?: string; warnDays?: number }
) {
	const existing = db.select().from(households).where(eq(households.id, householdId)).get();
	if (!existing) throw new HouseholdError('not_found');

	const set: { name?: string; warnDays?: number } = {};
	if (patch.name !== undefined) {
		const name = patch.name.trim();
		if (name.length < 1 || name.length > 80) throw new HouseholdError('invalid');
		set.name = name;
	}
	if (patch.warnDays !== undefined) {
		if (!Number.isInteger(patch.warnDays) || patch.warnDays < 0 || patch.warnDays > 30) {
			throw new HouseholdError('invalid');
		}
		set.warnDays = patch.warnDays;
	}
	if (Object.keys(set).length > 0) {
		db.update(households).set(set).where(eq(households.id, householdId)).run();
	}
	return { ...existing, ...set };
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
