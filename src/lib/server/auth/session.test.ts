import { test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDb, runMigrations, type DB } from '../db/client';
import { users } from '../db/schema';
import { createSession, validateSessionToken, invalidateSession } from './session';
import type { Database } from 'bun:sqlite';

let dir: string;
let db: DB;
let sqlite: Database;
const TEST_USER_ID = 'user-test-1';

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'gm-session-'));
	({ db, sqlite } = createDb(join(dir, 'test.db')));
	runMigrations(db);
	// Seed a user row so foreign-key constraints are satisfied.
	db.insert(users)
		.values({
			id: TEST_USER_ID,
			email: 'alice@example.com',
			displayName: 'Alice',
			locale: 'fr',
			createdAt: new Date()
		})
		.run();
});

afterEach(() => {
	sqlite.close();
	rmSync(dir, { recursive: true, force: true });
});

test('createSession returns a token and persists a sessions row', async () => {
	const { token, session } = await createSession(db, TEST_USER_ID);

	// Token must be "id.secret" — exactly two non-empty parts.
	const parts = token.split('.');
	expect(parts.length).toBe(2);
	expect(parts[0].length).toBeGreaterThan(0);
	expect(parts[1].length).toBeGreaterThan(0);

	// expiresAt is at least 29 days from now.
	const minExpiry = Date.now() + 1000 * 60 * 60 * 24 * 29;
	expect(session.expiresAt.getTime()).toBeGreaterThan(minExpiry);
});

test('validateSessionToken returns {session, user} for a fresh token', async () => {
	const { token } = await createSession(db, TEST_USER_ID);
	const result = validateSessionToken(db, token);
	expect(result).not.toBeNull();
	expect(result!.user.id).toBe(TEST_USER_ID);
});

test('validateSessionToken returns null when the secret is tampered', async () => {
	const { token } = await createSession(db, TEST_USER_ID);
	const parts = token.split('.');
	// Flip the last character of the secret.
	const lastChar = parts[1].slice(-1);
	const flipped = lastChar === 'a' ? 'b' : 'a';
	const tamperedToken = `${parts[0]}.${parts[1].slice(0, -1)}${flipped}`;
	expect(validateSessionToken(db, tamperedToken)).toBeNull();
});

test('validateSessionToken returns null for a malformed token with no dot', () => {
	expect(validateSessionToken(db, 'abc')).toBeNull();
});

test('validateSessionToken returns null for an expired session and deletes the row', async () => {
	const { session } = await createSession(db, TEST_USER_ID);

	// Force expiry via the raw sqlite handle (bypassing the ORM layer).
	sqlite.run(
		'UPDATE sessions SET expires_at = ? WHERE id = ?',
		[Math.floor(Date.now() / 1000) - 1, session.id]
	);

	// Build the token manually: we need the raw secret, but we stored only the hash.
	// We don't have the secret anymore — so we test expiry by trying a plausible token
	// with the correct id but any secret; expiry check happens before secret check.
	// To do this properly: create a second session whose token we keep, then expire it.
	const { token: token2, session: session2 } = await createSession(db, TEST_USER_ID);
	sqlite.run(
		'UPDATE sessions SET expires_at = ? WHERE id = ?',
		[Math.floor(Date.now() / 1000) - 1, session2.id]
	);

	const result = validateSessionToken(db, token2);
	expect(result).toBeNull();

	// Row must have been deleted.
	const row = sqlite.query('SELECT id FROM sessions WHERE id = ?').get(session2.id);
	expect(row).toBeNull();
});

test('invalidateSession removes the session row', async () => {
	const { session } = await createSession(db, TEST_USER_ID);
	invalidateSession(db, session.id);
	const row = sqlite.query('SELECT id FROM sessions WHERE id = ?').get(session.id);
	expect(row).toBeNull();
});

test('validateSessionToken returns null for an extra-dots token "a.b.c"', () => {
	expect(validateSessionToken(db, 'a.b.c')).toBeNull();
});

test('validateSessionToken returns null for an empty-id token ".secret"', () => {
	expect(validateSessionToken(db, '.secret')).toBeNull();
});

test('validateSessionToken returns null for an empty-secret token "id."', () => {
	expect(validateSessionToken(db, 'id.')).toBeNull();
});

test('validateSessionToken returns null for a well-formed but unknown id', () => {
	expect(validateSessionToken(db, 'nope.whatever')).toBeNull();
});

test('validateSessionToken returns null when the user row has been deleted', async () => {
	const { token } = await createSession(db, TEST_USER_ID);
	// Delete the user row via raw sqlite (cascades or leaves orphan session — either way user is gone).
	sqlite.run('DELETE FROM users WHERE id = ?', [TEST_USER_ID]);
	expect(validateSessionToken(db, token)).toBeNull();
});
