import { test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq, and } from 'drizzle-orm';
import { createDb, runMigrations, type DB } from './db/client';
import { users, memberships, households, invitations } from './db/schema';
import {
	createHousehold,
	listForUser,
	resolveActiveHouseholdId,
	requireMembership,
	MembershipError,
	updateHousehold,
	deleteHousehold,
	setMemberRole,
	removeMember,
	countAdmins,
	HouseholdError
} from './households';
import type { Database } from 'bun:sqlite';

let dir: string;
let db: DB;
let sqlite: Database;

const OWNER_ID = 'user-owner-1';
const MEMBER_ID = 'user-member-2';

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'gm-households-'));
	({ db, sqlite } = createDb(join(dir, 'test.db')));
	runMigrations(db);

	// Seed two users.
	db.insert(users)
		.values({
			id: OWNER_ID,
			email: 'owner@example.com',
			displayName: 'Owner',
			locale: 'fr',
			createdAt: new Date()
		})
		.run();

	db.insert(users)
		.values({
			id: MEMBER_ID,
			email: 'member@example.com',
			displayName: 'Member',
			locale: 'en',
			createdAt: new Date()
		})
		.run();
});

afterEach(() => {
	sqlite.close();
	rmSync(dir, { recursive: true, force: true });
});

test('createHousehold inserts the household AND an admin membership', () => {
	const household = createHousehold(db, { name: 'Chez Nous', ownerId: OWNER_ID });

	expect(household.name).toBe('Chez Nous');
	expect(household.id).toBeTruthy();
	expect(household.warnDays).toBe(3);

	// The membership row must also exist.
	const allMemberships = db.select().from(memberships).all();
	expect(allMemberships.length).toBe(1);
	expect(allMemberships[0].householdId).toBe(household.id);
	expect(allMemberships[0].userId).toBe(OWNER_ID);
	expect(allMemberships[0].role).toBe('admin');
});

test('listForUser returns the household with role "admin"', () => {
	const household = createHousehold(db, { name: 'La Maison', ownerId: OWNER_ID });

	const list = listForUser(db, OWNER_ID);
	expect(list.length).toBe(1);
	expect(list[0].id).toBe(household.id);
	expect(list[0].name).toBe('La Maison');
	expect(list[0].role).toBe('admin');
});

test('listForUser returns an empty list when user has no households', () => {
	createHousehold(db, { name: 'Someone Else', ownerId: OWNER_ID });
	const list = listForUser(db, MEMBER_ID);
	expect(list.length).toBe(0);
});

test('requireMembership returns the membership for a valid member', () => {
	const household = createHousehold(db, { name: 'Home', ownerId: OWNER_ID });

	// Add MEMBER_ID as a regular member.
	db.insert(memberships)
		.values({
			id: crypto.randomUUID(),
			householdId: household.id,
			userId: MEMBER_ID,
			role: 'member',
			joinedAt: new Date()
		})
		.run();

	const m = requireMembership(db, household.id, MEMBER_ID);
	expect(m.userId).toBe(MEMBER_ID);
	expect(m.role).toBe('member');
});

test('resolveActiveHouseholdId keeps a cookie that matches a member household', () => {
	const a = createHousehold(db, { name: 'A', ownerId: MEMBER_ID });
	const b = createHousehold(db, { name: 'B', ownerId: MEMBER_ID });
	const list = listForUser(db, MEMBER_ID);

	expect(resolveActiveHouseholdId(b.id, list)).toBe(b.id);
	expect(resolveActiveHouseholdId(a.id, list)).toBe(a.id);
});

test('resolveActiveHouseholdId falls back when the cookie points to a non-member household', () => {
	// Owner's private household — the member is NOT in it.
	const ownerOnly = createHousehold(db, { name: 'Owner Only', ownerId: OWNER_ID });
	// The household the member actually belongs to.
	const shared = createHousehold(db, { name: 'Shared', ownerId: MEMBER_ID });
	const list = listForUser(db, MEMBER_ID);

	// A stale cookie pointing at a household the member no longer/never belonged to
	// must resolve to one of THEIR households — never the stale id (which would 403).
	expect(resolveActiveHouseholdId(ownerOnly.id, list)).toBe(shared.id);
	// Unset cookie falls back too.
	expect(resolveActiveHouseholdId(null, list)).toBe(shared.id);
});

test('requireMembership throws MembershipError("not_member") for a non-member', () => {
	const household = createHousehold(db, { name: 'Private', ownerId: OWNER_ID });

	expect(() => requireMembership(db, household.id, MEMBER_ID)).toThrow(MembershipError);

	try {
		requireMembership(db, household.id, MEMBER_ID);
	} catch (e) {
		expect(e).toBeInstanceOf(MembershipError);
		expect((e as MembershipError).code).toBe('not_member');
	}
});

test('requireMembership throws MembershipError("forbidden") when admin required but user is member', () => {
	const household = createHousehold(db, { name: 'Shared', ownerId: OWNER_ID });

	// Seed MEMBER_ID as a regular member.
	db.insert(memberships)
		.values({
			id: crypto.randomUUID(),
			householdId: household.id,
			userId: MEMBER_ID,
			role: 'member',
			joinedAt: new Date()
		})
		.run();

	expect(() => requireMembership(db, household.id, MEMBER_ID, 'admin')).toThrow(MembershipError);

	try {
		requireMembership(db, household.id, MEMBER_ID, 'admin');
	} catch (e) {
		expect(e).toBeInstanceOf(MembershipError);
		expect((e as MembershipError).code).toBe('forbidden');
	}
});

test('requireMembership does NOT throw when admin required and user IS admin', () => {
	const household = createHousehold(db, { name: 'Admins Only', ownerId: OWNER_ID });
	const m = requireMembership(db, household.id, OWNER_ID, 'admin');
	expect(m.role).toBe('admin');
});

function addMember(householdId: string, userId: string, role: 'admin' | 'member') {
	db.insert(memberships)
		.values({ id: crypto.randomUUID(), householdId, userId, role, joinedAt: new Date() })
		.run();
}

test('updateHousehold changes name and warnDays', () => {
	const h = createHousehold(db, { name: 'Old', ownerId: OWNER_ID });
	const updated = updateHousehold(db, h.id, { name: 'New', warnDays: 7 });
	expect(updated.name).toBe('New');
	expect(updated.warnDays).toBe(7);
	const row = db.select().from(households).where(eq(households.id, h.id)).get();
	expect(row?.name).toBe('New');
	expect(row?.warnDays).toBe(7);
});

test('updateHousehold trims the name', () => {
	const h = createHousehold(db, { name: 'X', ownerId: OWNER_ID });
	expect(updateHousehold(db, h.id, { name: '  Trimmed  ' }).name).toBe('Trimmed');
});

test('updateHousehold rejects empty and oversized names', () => {
	const h = createHousehold(db, { name: 'X', ownerId: OWNER_ID });
	expect(() => updateHousehold(db, h.id, { name: '   ' })).toThrow(HouseholdError);
	expect(() => updateHousehold(db, h.id, { name: 'a'.repeat(81) })).toThrow(HouseholdError);
	// Accept-side boundary: exactly 80 chars is allowed.
	expect(updateHousehold(db, h.id, { name: 'a'.repeat(80) }).name.length).toBe(80);
});

test('updateHousehold rejects out-of-range warnDays', () => {
	const h = createHousehold(db, { name: 'X', ownerId: OWNER_ID });
	expect(() => updateHousehold(db, h.id, { warnDays: 31 })).toThrow(HouseholdError);
	expect(() => updateHousehold(db, h.id, { warnDays: -1 })).toThrow(HouseholdError);
	expect(() => updateHousehold(db, h.id, { warnDays: 1.5 })).toThrow(HouseholdError);
	// Accept-side boundaries: 0 and 30 are allowed.
	expect(updateHousehold(db, h.id, { warnDays: 0 }).warnDays).toBe(0);
	expect(updateHousehold(db, h.id, { warnDays: 30 }).warnDays).toBe(30);
});

test('updateHousehold throws not_found for an unknown id', () => {
	expect(() => updateHousehold(db, 'nope', { name: 'X' })).toThrow(HouseholdError);
});

test('deleteHousehold removes the household and cascades memberships + invitations', () => {
	const h = createHousehold(db, { name: 'Doomed', ownerId: OWNER_ID });
	addMember(h.id, MEMBER_ID, 'member');
	db.insert(invitations)
		.values({
			id: crypto.randomUUID(),
			householdId: h.id,
			tokenHash: Buffer.from('x'),
			role: 'member',
			createdBy: OWNER_ID,
			expiresAt: new Date(Date.now() + 100000),
			usedAt: null,
			createdAt: new Date()
		})
		.run();

	deleteHousehold(db, h.id);

	expect(db.select().from(households).where(eq(households.id, h.id)).get()).toBeUndefined();
	expect(db.select().from(memberships).where(eq(memberships.householdId, h.id)).all().length).toBe(
		0
	);
	expect(db.select().from(invitations).where(eq(invitations.householdId, h.id)).all().length).toBe(
		0
	);
});

test('deleteHousehold throws not_found for an unknown id', () => {
	expect(() => deleteHousehold(db, 'nope')).toThrow(HouseholdError);
});

test('setMemberRole promotes a member to admin', () => {
	const h = createHousehold(db, { name: 'H', ownerId: OWNER_ID });
	addMember(h.id, MEMBER_ID, 'member');
	setMemberRole(db, h.id, MEMBER_ID, 'admin');
	const m = db
		.select()
		.from(memberships)
		.where(and(eq(memberships.householdId, h.id), eq(memberships.userId, MEMBER_ID)))
		.get();
	expect(m?.role).toBe('admin');
});

test('setMemberRole blocks demoting the last admin', () => {
	const h = createHousehold(db, { name: 'H', ownerId: OWNER_ID });
	expect(() => setMemberRole(db, h.id, OWNER_ID, 'member')).toThrow(HouseholdError);
});

test('setMemberRole allows demoting one of several admins', () => {
	const h = createHousehold(db, { name: 'H', ownerId: OWNER_ID });
	addMember(h.id, MEMBER_ID, 'admin');
	setMemberRole(db, h.id, OWNER_ID, 'member');
	const m = db
		.select()
		.from(memberships)
		.where(and(eq(memberships.householdId, h.id), eq(memberships.userId, OWNER_ID)))
		.get();
	expect(m?.role).toBe('member');
});

test('setMemberRole throws not_found for a non-member target', () => {
	const h = createHousehold(db, { name: 'H', ownerId: OWNER_ID });
	expect(() => setMemberRole(db, h.id, MEMBER_ID, 'admin')).toThrow(HouseholdError);
});

test('removeMember removes a regular member', () => {
	const h = createHousehold(db, { name: 'H', ownerId: OWNER_ID });
	addMember(h.id, MEMBER_ID, 'member');
	removeMember(db, h.id, MEMBER_ID);
	const m = db
		.select()
		.from(memberships)
		.where(and(eq(memberships.householdId, h.id), eq(memberships.userId, MEMBER_ID)))
		.get();
	expect(m).toBeUndefined();
});

test('removeMember blocks removing the last admin', () => {
	const h = createHousehold(db, { name: 'H', ownerId: OWNER_ID });
	expect(() => removeMember(db, h.id, OWNER_ID)).toThrow(HouseholdError);
});

test('removeMember lets an admin leave when another admin remains', () => {
	const h = createHousehold(db, { name: 'H', ownerId: OWNER_ID });
	addMember(h.id, MEMBER_ID, 'admin');
	removeMember(db, h.id, OWNER_ID);
	expect(
		db
			.select()
			.from(memberships)
			.where(and(eq(memberships.householdId, h.id), eq(memberships.userId, OWNER_ID)))
			.get()
	).toBeUndefined();
	expect(countAdmins(db, h.id)).toBe(1);
});

test('removeMember throws not_found for a non-member target', () => {
	const h = createHousehold(db, { name: 'H', ownerId: OWNER_ID });
	expect(() => removeMember(db, h.id, MEMBER_ID)).toThrow(HouseholdError);
});
