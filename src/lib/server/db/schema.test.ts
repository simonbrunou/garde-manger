import { describe, it, expect, beforeEach } from 'bun:test';
import { createDb, runMigrations } from './client';
import { users, sessions, households, memberships, invitations, credentials } from './schema';
import { eq } from 'drizzle-orm';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function makeDb() {
	const path = join(tmpdir(), `schema-test-${crypto.randomUUID()}.db`);
	const { db, sqlite } = createDb(path);
	runMigrations(db);
	return { db, sqlite };
}

describe('schema', () => {
	let db: ReturnType<typeof makeDb>['db'];
	let sqlite: ReturnType<typeof makeDb>['sqlite'];

	beforeEach(() => {
		const result = makeDb();
		db = result.db;
		sqlite = result.sqlite;
	});

	it('inserts a user and a session (FK ok)', async () => {
		const userId = crypto.randomUUID();
		const now = new Date();

		await db.insert(users).values({
			id: userId,
			email: 'alice@example.com',
			displayName: 'Alice',
			locale: 'fr',
			createdAt: now
		});

		const sessionId = crypto.randomUUID();
		await db.insert(sessions).values({
			id: sessionId,
			secretHash: Buffer.from('secret-hash-bytes'),
			userId,
			createdAt: now,
			expiresAt: new Date(now.getTime() + 86400_000)
		});

		const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
		expect(session.userId).toBe(userId);
	});

	it('inserts a household and membership, round-trips role', async () => {
		const userId = crypto.randomUUID();
		const householdId = crypto.randomUUID();
		const now = new Date();

		await db.insert(users).values({
			id: userId,
			email: 'bob@example.com',
			displayName: 'Bob',
			locale: 'en',
			createdAt: now
		});

		await db.insert(households).values({
			id: householdId,
			name: 'Maison Bob',
			warnDays: 3,
			createdAt: now
		});

		const membershipId = crypto.randomUUID();
		await db.insert(memberships).values({
			id: membershipId,
			householdId,
			userId,
			role: 'admin',
			joinedAt: now
		});

		const [membership] = await db.select().from(memberships).where(eq(memberships.id, membershipId));
		expect(membership.role).toBe('admin');
		expect(membership.householdId).toBe(householdId);
		expect(membership.userId).toBe(userId);
	});

	it('throws on composite unique violation (same householdId + userId)', async () => {
		const userId = crypto.randomUUID();
		const householdId = crypto.randomUUID();
		const now = new Date();

		await db.insert(users).values({
			id: userId,
			email: 'carol@example.com',
			displayName: 'Carol',
			locale: 'fr',
			createdAt: now
		});

		await db.insert(households).values({
			id: householdId,
			name: 'Maison Carol',
			createdAt: now
		});

		await db.insert(memberships).values({
			id: crypto.randomUUID(),
			householdId,
			userId,
			role: 'member',
			joinedAt: now
		});

		// Second membership with same householdId + userId must throw
		expect(() =>
			db.insert(memberships).values({
				id: crypto.randomUUID(),
				householdId,
				userId,
				role: 'admin',
				joinedAt: now
			}).run()
		).toThrow();
	});

	it('throws on FK violation (non-existent householdId)', async () => {
		const userId = crypto.randomUUID();
		const now = new Date();

		await db.insert(users).values({
			id: userId,
			email: 'dave@example.com',
			displayName: 'Dave',
			locale: 'fr',
			createdAt: now
		});

		expect(() =>
			db.insert(memberships).values({
				id: crypto.randomUUID(),
				householdId: crypto.randomUUID(), // non-existent
				userId,
				role: 'member',
				joinedAt: now
			}).run()
		).toThrow();
	});

	it('inserts a credential and an invitation, selects them back', async () => {
		const userId = crypto.randomUUID();
		const householdId = crypto.randomUUID();
		const now = new Date();

		await db.insert(users).values({
			id: userId,
			email: 'eve@example.com',
			displayName: 'Eve',
			locale: 'fr',
			createdAt: now
		});

		await db.insert(households).values({
			id: householdId,
			name: 'Maison Eve',
			createdAt: now
		});

		const credentialId = crypto.randomUUID();
		await db.insert(credentials).values({
			id: credentialId,
			userId,
			credentialId: 'cred-id-unique-abc',
			publicKey: Buffer.from('public-key-bytes'),
			counter: 0,
			backedUp: false,
			createdAt: now
		});

		const invitationId = crypto.randomUUID();
		await db.insert(invitations).values({
			id: invitationId,
			householdId,
			tokenHash: Buffer.from('token-hash-bytes'),
			role: 'member',
			createdBy: userId,
			expiresAt: new Date(now.getTime() + 86400_000),
			createdAt: now
		});

		const [cred] = await db.select().from(credentials).where(eq(credentials.id, credentialId));
		expect(cred.credentialId).toBe('cred-id-unique-abc');

		const [invite] = await db.select().from(invitations).where(eq(invitations.id, invitationId));
		expect(invite.householdId).toBe(householdId);
		expect(invite.role).toBe('member');
	});
});
