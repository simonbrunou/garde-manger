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
	patch: { name?: string; warnDays?: number },
	actingUserId?: string
) {
	// Defence in depth: when the acting user is supplied, the model layer itself
	// enforces admin so a caller cannot forget to gate the mutation.
	if (actingUserId) requireMembership(db, householdId, actingUserId, 'admin');
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

export function deleteHousehold(db: DB, householdId: string, actingUserId?: string) {
	if (actingUserId) requireMembership(db, householdId, actingUserId, 'admin');
	const existing = db.select().from(households).where(eq(households.id, householdId)).get();
	if (!existing) throw new HouseholdError('not_found');
	db.delete(households).where(eq(households.id, householdId)).run();
}

export function countAdmins(db: DB, householdId: string): number {
	return db
		.select({ userId: memberships.userId })
		.from(memberships)
		.where(and(eq(memberships.householdId, householdId), eq(memberships.role, 'admin')))
		.all().length;
}

export function setMemberRole(
	db: DB,
	householdId: string,
	targetUserId: string,
	role: 'admin' | 'member',
	actingUserId?: string
) {
	if (actingUserId) requireMembership(db, householdId, actingUserId, 'admin');
	const membership = db
		.select()
		.from(memberships)
		.where(and(eq(memberships.householdId, householdId), eq(memberships.userId, targetUserId)))
		.get();
	if (!membership) throw new HouseholdError('not_found');

	// Last-admin guard. This read-then-write is atomic on our runtime: bun:sqlite runs
	// synchronously and there is no `await` between the count and the update, so two
	// concurrent requests cannot interleave under the single-connection model.
	if (membership.role === 'admin' && role === 'member' && countAdmins(db, householdId) <= 1) {
		throw new HouseholdError('last_admin');
	}

	db.update(memberships)
		.set({ role })
		.where(and(eq(memberships.householdId, householdId), eq(memberships.userId, targetUserId)))
		.run();
}

export function removeMember(
	db: DB,
	householdId: string,
	targetUserId: string,
	actingUserId?: string
) {
	if (actingUserId) requireMembership(db, householdId, actingUserId, 'admin');
	const membership = db
		.select()
		.from(memberships)
		.where(and(eq(memberships.householdId, householdId), eq(memberships.userId, targetUserId)))
		.get();
	if (!membership) throw new HouseholdError('not_found');

	// Last-admin guard — atomic on our runtime (see setMemberRole): synchronous bun:sqlite,
	// no `await` between the count and the delete.
	if (membership.role === 'admin' && countAdmins(db, householdId) <= 1) {
		throw new HouseholdError('last_admin');
	}

	db.delete(memberships)
		.where(and(eq(memberships.householdId, householdId), eq(memberships.userId, targetUserId)))
		.run();
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

/**
 * Resolve the active household id the way the app layout does: trust the cookie
 * only when it points to a household the user is actually a member of, otherwise
 * fall back to their first household. Actions MUST use this rather than reading the
 * raw cookie — a stale cookie (e.g. left over after being removed from a household)
 * would otherwise authorise against a household the user no longer belongs to and 403.
 */
export function resolveActiveHouseholdId(
	cookieId: string | null,
	households: { id: string }[]
): string | null {
	const ids = households.map((h) => h.id);
	return cookieId && ids.includes(cookieId) ? cookieId : (households[0]?.id ?? null);
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
