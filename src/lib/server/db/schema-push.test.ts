import { describe, it, expect, beforeEach } from 'bun:test';
import { createDb, runMigrations } from './client';
import { pushSubscriptions, users } from './schema';
import { eq } from 'drizzle-orm';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function makeDb() {
	const path = join(tmpdir(), `schema-push-test-${crypto.randomUUID()}.db`);
	const { db } = createDb(path);
	runMigrations(db);
	return db;
}

function seedUser(db: ReturnType<typeof makeDb>, id = 'u1') {
	db.insert(users)
		.values({ id, email: `${id}@ex.test`, displayName: id, createdAt: new Date() })
		.run();
	return id;
}

describe('push_subscriptions schema', () => {
	let db: ReturnType<typeof makeDb>;
	beforeEach(() => {
		db = makeDb();
	});

	it('round-trips a subscription row', () => {
		const userId = seedUser(db);
		const createdAt = new Date('2026-05-29T08:00:00.000Z');
		db.insert(pushSubscriptions)
			.values({
				id: 's1',
				userId,
				endpoint: 'https://push.example/abc',
				p256dh: 'pub',
				auth: 'secret',
				deviceLabel: 'iPhone',
				createdAt
			})
			.run();

		const row = db.select().from(pushSubscriptions).where(eq(pushSubscriptions.id, 's1')).get();
		expect(row?.endpoint).toBe('https://push.example/abc');
		expect(row?.failureCount).toBe(0); // default
		expect(row?.lastNotifiedOn).toBeNull();
		expect(row?.lastSuccessAt).toBeNull();
		expect(row?.createdAt.getTime()).toBe(createdAt.getTime());
	});

	it('rejects a duplicate endpoint (unique)', () => {
		const userId = seedUser(db);
		const base = { p256dh: 'p', auth: 'a', createdAt: new Date() };
		db.insert(pushSubscriptions)
			.values({ id: 's1', userId, endpoint: 'https://push.example/x', ...base })
			.run();
		expect(() =>
			db
				.insert(pushSubscriptions)
				.values({ id: 's2', userId, endpoint: 'https://push.example/x', ...base })
				.run()
		).toThrow();
	});

	it('cascades on user delete', () => {
		const userId = seedUser(db);
		db.insert(pushSubscriptions)
			.values({
				id: 's1',
				userId,
				endpoint: 'https://push.example/y',
				p256dh: 'p',
				auth: 'a',
				createdAt: new Date()
			})
			.run();
		db.delete(users).where(eq(users.id, userId)).run();
		expect(db.select().from(pushSubscriptions).all().length).toBe(0);
	});
});
