import { test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDb, runMigrations, type DB } from './db/client';
import { users, memberships } from './db/schema';
import { createHousehold, listForUser, requireMembership, MembershipError } from './households';
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
