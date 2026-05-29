import { test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { createDb, runMigrations, type DB } from './db/client';
import { users, invitations, memberships } from './db/schema';
import { createInvitation, acceptInvitation, InvitationError } from './invitations';
import { createHousehold } from './households';
import type { Database } from 'bun:sqlite';

let dir: string;
let db: DB;
let sqlite: Database;

const OWNER_ID = 'user-owner-1';
const INVITEE_ID = 'user-invitee-2';
let householdId: string;

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'gm-invitations-'));
	({ db, sqlite } = createDb(join(dir, 'test.db')));
	runMigrations(db);

	// Seed owner user.
	db.insert(users)
		.values({
			id: OWNER_ID,
			email: 'owner@example.com',
			displayName: 'Owner',
			locale: 'fr',
			createdAt: new Date()
		})
		.run();

	// Seed invitee user.
	db.insert(users)
		.values({
			id: INVITEE_ID,
			email: 'invitee@example.com',
			displayName: 'Invitee',
			locale: 'en',
			createdAt: new Date()
		})
		.run();

	// Create a household (also seeds owner's admin membership).
	const hh = createHousehold(db, { name: 'Test Home', ownerId: OWNER_ID });
	householdId = hh.id;
});

afterEach(() => {
	sqlite.close();
	rmSync(dir, { recursive: true, force: true });
});

test('createInvitation stores ONLY the hash, not the raw token', () => {
	const { token, invitation } = createInvitation(db, {
		householdId,
		role: 'member',
		createdBy: OWNER_ID
	});

	expect(token).toBeTruthy();
	expect(token.length).toBeGreaterThan(10);

	// The stored tokenHash must not equal the raw token bytes.
	const tokenBytes = Buffer.from(token);
	const stored = invitation.tokenHash as Buffer;
	expect(stored.equals(tokenBytes)).toBe(false);

	// A row must exist in the DB.
	const rows = db.select().from(invitations).all();
	expect(rows.length).toBe(1);
	expect(rows[0].id).toBe(invitation.id);
});

test('createInvitation sets expiresAt ~7 days from now', () => {
	const { invitation } = createInvitation(db, {
		householdId,
		role: 'member',
		createdBy: OWNER_ID
	});

	const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
	const minExpiry = Date.now() + sevenDaysMs - 5000;
	const maxExpiry = Date.now() + sevenDaysMs + 5000;
	expect(invitation.expiresAt.getTime()).toBeGreaterThan(minExpiry);
	expect(invitation.expiresAt.getTime()).toBeLessThan(maxExpiry);
});

test('acceptInvitation adds a membership with the invite role and marks usedAt', () => {
	const { token } = createInvitation(db, {
		householdId,
		role: 'member',
		createdBy: OWNER_ID
	});

	const membership = acceptInvitation(db, { token, userId: INVITEE_ID });

	expect(membership.userId).toBe(INVITEE_ID);
	expect(membership.householdId).toBe(householdId);
	expect(membership.role).toBe('member');

	// Check the invitation row is marked as used.
	const inviteRows = db.select().from(invitations).all();
	expect(inviteRows[0].usedAt).not.toBeNull();

	// Check the membership row exists in DB.
	const membershipRows = db.select().from(memberships).all();
	// 2 rows: owner (admin) + invitee (member)
	expect(membershipRows.length).toBe(2);
});

test('acceptInvitation throws InvitationError("already_used") when re-used', () => {
	const { token } = createInvitation(db, {
		householdId,
		role: 'member',
		createdBy: OWNER_ID
	});

	// First accept: succeeds.
	acceptInvitation(db, { token, userId: INVITEE_ID });

	// Second accept: must throw.
	expect(() => acceptInvitation(db, { token, userId: INVITEE_ID })).toThrow(InvitationError);

	try {
		acceptInvitation(db, { token, userId: INVITEE_ID });
	} catch (e) {
		expect(e).toBeInstanceOf(InvitationError);
		expect((e as InvitationError).code).toBe('already_used');
	}
});

test('acceptInvitation throws InvitationError("expired") for an expired invite', () => {
	const { invitation } = createInvitation(db, {
		householdId,
		role: 'member',
		createdBy: OWNER_ID
	});

	// Force the invite to be expired via raw SQL.
	sqlite.run('UPDATE invitations SET expires_at = ? WHERE id = ?', [
		Math.floor(Date.now() / 1000) - 1,
		invitation.id
	]);

	// Simpler: insert an already-expired invite directly.
	const pastDate = new Date(Date.now() - 1000);
	const expiredId = crypto.randomUUID();
	const fakeToken = randomBytes(24).toString('base64url');
	const fakeHash = createHash('sha256').update(fakeToken).digest();

	db.insert(invitations)
		.values({
			id: expiredId,
			householdId,
			tokenHash: fakeHash,
			role: 'member',
			createdBy: OWNER_ID,
			expiresAt: pastDate,
			usedAt: null,
			createdAt: pastDate
		})
		.run();

	expect(() => acceptInvitation(db, { token: fakeToken, userId: INVITEE_ID })).toThrow(
		InvitationError
	);

	try {
		acceptInvitation(db, { token: fakeToken, userId: INVITEE_ID });
	} catch (e) {
		expect(e).toBeInstanceOf(InvitationError);
		expect((e as InvitationError).code).toBe('expired');
	}
});

test('acceptInvitation throws InvitationError("not_found") for a bogus token', () => {
	expect(() => acceptInvitation(db, { token: 'bogus-token-that-does-not-exist', userId: INVITEE_ID })).toThrow(
		InvitationError
	);

	try {
		acceptInvitation(db, { token: 'bogus', userId: INVITEE_ID });
	} catch (e) {
		expect(e).toBeInstanceOf(InvitationError);
		expect((e as InvitationError).code).toBe('not_found');
	}
});

test('acceptInvitation is idempotent when user is already a member — no duplicate membership, marks used', () => {
	const { token } = createInvitation(db, {
		householdId,
		role: 'member',
		createdBy: OWNER_ID
	});

	// Manually insert INVITEE as an existing member before accepting.
	db.insert(memberships)
		.values({
			id: crypto.randomUUID(),
			householdId,
			userId: INVITEE_ID,
			role: 'member',
			joinedAt: new Date()
		})
		.run();

	// Should NOT throw — returns existing membership.
	const result = acceptInvitation(db, { token, userId: INVITEE_ID });
	expect(result.userId).toBe(INVITEE_ID);

	// Membership count must still be 2 (owner + invitee), not 3.
	const membershipRows = db.select().from(memberships).all();
	expect(membershipRows.length).toBe(2);

	// Invite must be marked used.
	const inviteRows = db.select().from(invitations).all();
	expect(inviteRows[0].usedAt).not.toBeNull();
});
