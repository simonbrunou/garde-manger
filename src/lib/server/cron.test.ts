import { describe, it, expect, beforeEach } from 'bun:test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { eq } from 'drizzle-orm';
import { createDb, runMigrations, type DB } from './db/client';
import { users, households, memberships, inventoryItems, pushSubscriptions } from './db/schema';
import { saveSubscription, listSubscriptionsForUser, type PushSender, type Vapid } from './push';
import { runDailyReminders, secretMatches } from './cron';

// ── Test DB harness ─────────────────────────────────────────────────────────

function makeDb(): DB {
	const path = join(tmpdir(), `cron-test-${crypto.randomUUID()}.db`);
	const { db } = createDb(path);
	runMigrations(db);
	return db;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ORIGIN = 'https://x.test';
const FIXED_NOW = new Date('2026-05-29T08:30:00.000Z');
const TODAY = '2026-05-29';

const VAPID: Vapid = {
	publicKey: 'pub-key',
	privateKey: 'priv-key',
	subject: 'mailto:test@example.test'
};

const DAY_MS = 86_400_000;

function makeUser(db: DB, id: string, locale: 'fr' | 'en'): void {
	db.insert(users)
		.values({
			id,
			email: `${id}@example.test`,
			displayName: id,
			locale,
			createdAt: FIXED_NOW
		})
		.run();
}

/** A household (warn_days 3) + membership for `userId`. Returns the household id. */
function makeHousehold(db: DB, id: string, userId: string): string {
	db.insert(households).values({ id, name: id, warnDays: 3, createdAt: FIXED_NOW }).run();
	db.insert(memberships)
		.values({
			id: `m-${id}-${userId}`,
			householdId: id,
			userId,
			role: 'admin',
			joinedAt: FIXED_NOW
		})
		.run();
	return id;
}

/** An active item with a use-by date `daysFromNow` days out from FIXED_NOW. */
function makeItem(
	db: DB,
	id: string,
	householdId: string,
	userId: string,
	daysFromNow: number
): void {
	db.insert(inventoryItems)
		.values({
			id,
			householdId,
			addedBy: userId,
			kind: 'fresh',
			location: 'fridge',
			quantity: 1,
			status: 'active',
			isEstimate: false,
			addedAt: FIXED_NOW,
			useByDate: new Date(FIXED_NOW.getTime() + daysFromNow * DAY_MS)
		})
		.run();
}

// ── Fake sender ─────────────────────────────────────────────────────────────

interface FakeSender extends PushSender {
	payloads: string[];
}

/** A PushSender that records payloads and returns a canned status (or throws). */
function makeSender(opts: { status?: number; throws?: boolean } = {}): FakeSender {
	const payloads: string[] = [];
	return {
		payloads,
		async send(_target, payload) {
			payloads.push(payload);
			if (opts.throws) throw new Error('transport exploded');
			return opts.status ?? 201;
		}
	};
}

function getSub(db: DB, endpoint: string) {
	return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).get();
}

// ── runDailyReminders ─────────────────────────────────────────────────────────

describe('runDailyReminders', () => {
	let db: DB;

	beforeEach(() => {
		db = makeDb();
		// A user (locale 'en') with a household (warn_days 3), membership, an active
		// item expiring soon, and 2 push subscriptions.
		makeUser(db, 'user-a', 'en');
		makeHousehold(db, 'hh-1', 'user-a');
		makeItem(db, 'item-soon', 'hh-1', 'user-a', 1); // 1 day out → within warn window
		saveSubscription(db, 'user-a', {
			endpoint: 'https://push.example/aaa',
			keys: { p256dh: 'p256dh-a', auth: 'auth-a' }
		});
		saveSubscription(db, 'user-a', {
			endpoint: 'https://push.example/bbb',
			keys: { p256dh: 'p256dh-b', auth: 'auth-b' }
		});
	});

	it('happy path: sends to both devices, marks the user notified, stamps lastNotifiedOn', async () => {
		const sender = makeSender({ status: 201 });
		const summary = await runDailyReminders(db, {
			vapid: VAPID,
			sender,
			origin: ORIGIN,
			now: FIXED_NOW
		});

		expect(summary.devicesSent).toBe(2);
		expect(summary.usersNotified).toBe(1);
		expect(summary.pruned).toBe(0);
		expect(summary.failed).toBe(0);
		expect(summary.skipped).toBe(0);

		// Both subs stamped today + lastSuccessAt set.
		for (const endpoint of ['https://push.example/aaa', 'https://push.example/bbb']) {
			const row = getSub(db, endpoint);
			expect(row?.lastNotifiedOn).toBe(TODAY);
			expect(row?.lastSuccessAt?.getTime()).toBe(FIXED_NOW.getTime());
		}

		// The sent payload carries the count (1 item) and the origin deep-link.
		expect(sender.payloads).toHaveLength(2);
		const obj = JSON.parse(sender.payloads[0]);
		expect(obj.notification.body).toContain('1');
		expect(obj.notification.navigate).toBe(`${ORIGIN}/garde-manger?filter=expiring`);
		// Locale 'en' honoured.
		expect(obj.notification.lang).toBe('en');
	});

	it('idempotency: a second run with the same now skips both devices (no re-send)', async () => {
		const first = makeSender({ status: 201 });
		await runDailyReminders(db, { vapid: VAPID, sender: first, origin: ORIGIN, now: FIXED_NOW });

		const second = makeSender({ status: 201 });
		const summary = await runDailyReminders(db, {
			vapid: VAPID,
			sender: second,
			origin: ORIGIN,
			now: FIXED_NOW
		});

		expect(summary.skipped).toBe(2);
		expect(summary.devicesSent).toBe(0);
		expect(summary.usersNotified).toBe(0);
		expect(second.payloads).toHaveLength(0); // sender never invoked
	});

	it('prune: a 410 from the sender deletes the row and tallies pruned', async () => {
		const sender = makeSender({ status: 410 });
		const summary = await runDailyReminders(db, {
			vapid: VAPID,
			sender,
			origin: ORIGIN,
			now: FIXED_NOW
		});

		expect(summary.pruned).toBe(2);
		expect(summary.devicesSent).toBe(0);
		expect(summary.usersNotified).toBe(0);
		expect(listSubscriptionsForUser(db, 'user-a')).toHaveLength(0);
	});

	it('failure: a 500 increments failed, keeps the row, and does NOT stamp lastNotifiedOn', async () => {
		const sender = makeSender({ status: 500 });
		const summary = await runDailyReminders(db, {
			vapid: VAPID,
			sender,
			origin: ORIGIN,
			now: FIXED_NOW
		});

		expect(summary.failed).toBe(2);
		expect(summary.devicesSent).toBe(0);
		expect(summary.usersNotified).toBe(0);

		const row = getSub(db, 'https://push.example/aaa');
		expect(row).toBeTruthy();
		expect(row?.failureCount).toBe(1);
		expect(row?.lastNotifiedOn).toBeNull(); // un-stamped → retried next run
	});

	it('no targets: a user with only far-future items yields an all-zero summary', async () => {
		const fresh = makeDb();
		makeUser(fresh, 'user-z', 'fr');
		makeHousehold(fresh, 'hh-z', 'user-z');
		makeItem(fresh, 'item-far', 'hh-z', 'user-z', 365); // well beyond warn_days 3
		saveSubscription(fresh, 'user-z', {
			endpoint: 'https://push.example/zzz',
			keys: { p256dh: 'p', auth: 'a' }
		});

		const sender = makeSender({ status: 201 });
		const summary = await runDailyReminders(fresh, {
			vapid: VAPID,
			sender,
			origin: ORIGIN,
			now: FIXED_NOW
		});

		expect(summary).toEqual({
			usersNotified: 0,
			devicesSent: 0,
			pruned: 0,
			failed: 0,
			skipped: 0
		});
		expect(sender.payloads).toHaveLength(0);
	});
});

// ── secretMatches (constant-time, length-guarded) ───────────────────────────────

describe('secretMatches', () => {
	it('returns true for an exact match', () => {
		expect(secretMatches('s3cr3t-value', 's3cr3t-value')).toBe(true);
	});

	it('returns false for a wrong value of the same length', () => {
		expect(secretMatches('s3cr3t-value', 's3cr3t-VALUE')).toBe(false);
	});

	it('returns false (no throw) for a different length', () => {
		expect(secretMatches('s3cr3t-value', 'short')).toBe(false);
		expect(secretMatches('short', 's3cr3t-value-longer')).toBe(false);
	});

	it('returns false for a blank/absent presented value', () => {
		expect(secretMatches('s3cr3t', '')).toBe(false);
		expect(secretMatches('s3cr3t', null)).toBe(false);
		expect(secretMatches('s3cr3t', undefined)).toBe(false);
	});

	it('returns false when the expected secret is empty (no empty-secret bypass)', () => {
		expect(secretMatches('', '')).toBe(false);
		expect(secretMatches('', 'anything')).toBe(false);
	});
});
