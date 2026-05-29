import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { DB } from '../db/client';
import { sessions, users } from '../db/schema';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const sha256 = (s: string) => createHash('sha256').update(s).digest(); // Buffer
const randomId = (bytes = 18) => randomBytes(bytes).toString('base64url');

export async function createSession(db: DB, userId: string) {
	const id = randomId();
	const secret = randomId(24);
	const now = new Date();
	const session = {
		id,
		secretHash: sha256(secret),
		userId,
		createdAt: now,
		expiresAt: new Date(now.getTime() + SESSION_TTL_MS)
	};
	db.insert(sessions).values(session).run();
	return { token: `${id}.${secret}`, session };
}

export function validateSessionToken(db: DB, token: string) {
	const parts = token.split('.');
	if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
	const [id, secret] = parts;
	const row = db.select().from(sessions).where(eq(sessions.id, id)).get();
	if (!row) return null;
	if (row.expiresAt.getTime() < Date.now()) {
		db.delete(sessions).where(eq(sessions.id, id)).run();
		return null;
	}
	const expected = row.secretHash as Buffer;
	const actual = sha256(secret);
	if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
	const user = db.select().from(users).where(eq(users.id, row.userId)).get();
	if (!user) return null;
	return { session: row, user };
}

export function invalidateSession(db: DB, sessionId: string) {
	db.delete(sessions).where(eq(sessions.id, sessionId)).run();
}
