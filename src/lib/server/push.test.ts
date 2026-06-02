import { describe, it, expect, beforeEach } from 'bun:test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { eq } from 'drizzle-orm';
import { createDb, runMigrations, type DB } from './db/client';
import { users, pushSubscriptions } from './db/schema';
import {
	buildDailyPayload,
	saveSubscription,
	deleteSubscriptionByEndpoint,
	listSubscriptionsForUser,
	sendToSubscription,
	isSafePushEndpoint,
	isEndpointSendable,
	type PushSender,
	type WebPushTarget,
	type Vapid
} from './push';

// ── Test DB harness ─────────────────────────────────────────────────────────

function makeDb(): DB {
	const path = join(tmpdir(), `push-test-${crypto.randomUUID()}.db`);
	const { db } = createDb(path);
	runMigrations(db);
	return db;
}

// pushSubscriptions.userId has an FK to users.id (foreign_keys = ON), so any
// owner referenced by a subscription must exist first.
function makeUser(db: DB, id: string): void {
	db.insert(users)
		.values({
			id,
			email: `${id}@example.test`,
			displayName: id,
			locale: 'fr',
			createdAt: new Date()
		})
		.run();
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ORIGIN = 'https://garde-manger.example';
const FIXED_NOW = new Date('2026-05-29T08:30:00.000Z');
const TODAY = '2026-05-29';

const VAPID: Vapid = {
	publicKey: 'pub-key',
	privateKey: 'priv-key',
	subject: 'mailto:test@example.test'
};

const SUB_A = {
	endpoint: 'https://push.example/aaa',
	keys: { p256dh: 'p256dh-a', auth: 'auth-a' }
};
const SUB_B = {
	endpoint: 'https://push.example/bbb',
	keys: { p256dh: 'p256dh-b', auth: 'auth-b' }
};

// ── Fake sender ─────────────────────────────────────────────────────────────

interface SenderCall {
	target: WebPushTarget;
	payload: string;
	vapid: Vapid;
	ttl?: number;
}

interface FakeSender extends PushSender {
	calls: SenderCall[];
}

/** A PushSender that records its calls and returns a canned status (or throws). */
function makeSender(opts: { status?: number; throws?: boolean } = {}): FakeSender {
	const calls: SenderCall[] = [];
	return {
		calls,
		async send(target, payload, { vapid, ttl }) {
			calls.push({ target, payload, vapid, ttl });
			if (opts.throws) throw new Error('transport exploded');
			return opts.status ?? 201;
		}
	};
}

function getById(db: DB, id: string) {
	return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.id, id)).get();
}

// ── buildDailyPayload ─────────────────────────────────────────────────────────

describe('buildDailyPayload', () => {
	it('emits valid declarative Web Push JSON with web_push:8030 and a deep-link', () => {
		const str = buildDailyPayload({ count: 3, locale: 'fr', origin: ORIGIN });
		const obj = JSON.parse(str);
		expect(obj.web_push).toBe(8030);
		expect(obj.notification.navigate).toBe(`${ORIGIN}/garde-manger?filter=expiring`);
		expect(obj.notification.lang).toBe('fr');
		expect(obj.notification.body).toContain('3');
	});

	it('localizes the body differently for FR and EN', () => {
		const fr = JSON.parse(buildDailyPayload({ count: 5, locale: 'fr', origin: ORIGIN }));
		const en = JSON.parse(buildDailyPayload({ count: 5, locale: 'en', origin: ORIGIN }));
		expect(fr.notification.body).toBe('5 aliment(s) à consommer bientôt');
		expect(en.notification.body).toBe('5 item(s) to use soon');
		expect(fr.notification.body).not.toBe(en.notification.body);
	});

	it('serializes to under 3072 bytes', () => {
		const str = buildDailyPayload({ count: 999999, locale: 'fr', origin: ORIGIN });
		expect(new TextEncoder().encode(str).byteLength).toBeLessThan(3072);
	});

	it('has no actions array', () => {
		const obj = JSON.parse(buildDailyPayload({ count: 1, locale: 'en', origin: ORIGIN }));
		expect(obj.notification.actions).toBeUndefined();
	});
});

// ── saveSubscription ──────────────────────────────────────────────────────────

describe('saveSubscription', () => {
	let db: DB;
	beforeEach(() => {
		db = makeDb();
		makeUser(db, 'user-a');
	});

	it('inserts a new subscription', () => {
		saveSubscription(db, 'user-a', SUB_A, 'iPhone');
		const rows = listSubscriptionsForUser(db, 'user-a');
		expect(rows).toHaveLength(1);
		expect(rows[0].endpoint).toBe(SUB_A.endpoint);
		expect(rows[0].p256dh).toBe('p256dh-a');
		expect(rows[0].auth).toBe('auth-a');
		expect(rows[0].deviceLabel).toBe('iPhone');
		expect(rows[0].failureCount).toBe(0);
	});

	it('UPSERTs on the same endpoint (refreshes keys, does not duplicate)', () => {
		saveSubscription(db, 'user-a', SUB_A, 'old');
		saveSubscription(
			db,
			'user-a',
			{ endpoint: SUB_A.endpoint, keys: { p256dh: 'new-p', auth: 'new-a' } },
			'new'
		);
		const rows = listSubscriptionsForUser(db, 'user-a');
		expect(rows).toHaveLength(1);
		expect(rows[0].p256dh).toBe('new-p');
		expect(rows[0].auth).toBe('new-a');
		expect(rows[0].deviceLabel).toBe('new');
	});

	it('stores two different endpoints as two rows', () => {
		saveSubscription(db, 'user-a', SUB_A);
		saveSubscription(db, 'user-a', SUB_B);
		expect(listSubscriptionsForUser(db, 'user-a')).toHaveLength(2);
	});
});

// ── deleteSubscriptionByEndpoint (ownership-scoped) ─────────────────────────────

describe('deleteSubscriptionByEndpoint', () => {
	let db: DB;
	beforeEach(() => {
		db = makeDb();
		makeUser(db, 'user-a');
		makeUser(db, 'user-b');
	});

	it("removes the caller's own subscription", () => {
		saveSubscription(db, 'user-a', SUB_A);
		deleteSubscriptionByEndpoint(db, 'user-a', SUB_A.endpoint);
		expect(listSubscriptionsForUser(db, 'user-a')).toHaveLength(0);
	});

	it("does NOT delete another user's subscription with the same endpoint", () => {
		// user-a owns the endpoint; user-b tries to delete it by endpoint.
		saveSubscription(db, 'user-a', SUB_A);
		deleteSubscriptionByEndpoint(db, 'user-b', SUB_A.endpoint);
		// The row owned by user-a survives — ownership scope held.
		expect(listSubscriptionsForUser(db, 'user-a')).toHaveLength(1);
	});
});

// ── listSubscriptionsForUser (user-scoped) ──────────────────────────────────────

describe('listSubscriptionsForUser', () => {
	let db: DB;
	beforeEach(() => {
		db = makeDb();
		makeUser(db, 'user-a');
		makeUser(db, 'user-b');
	});

	it('returns only the rows owned by the given user', () => {
		saveSubscription(db, 'user-a', SUB_A);
		saveSubscription(db, 'user-b', SUB_B);
		const a = listSubscriptionsForUser(db, 'user-a');
		const b = listSubscriptionsForUser(db, 'user-b');
		expect(a).toHaveLength(1);
		expect(a[0].endpoint).toBe(SUB_A.endpoint);
		expect(b).toHaveLength(1);
		expect(b[0].endpoint).toBe(SUB_B.endpoint);
	});
});

// ── sendToSubscription (lifecycle) ──────────────────────────────────────────────

describe('sendToSubscription', () => {
	let db: DB;
	beforeEach(() => {
		db = makeDb();
		makeUser(db, 'user-a');
	});

	function seedSub() {
		saveSubscription(db, 'user-a', SUB_A, 'iPhone');
		const row = listSubscriptionsForUser(db, 'user-a')[0];
		return row;
	}

	const PAYLOAD = buildDailyPayload({ count: 2, locale: 'fr', origin: ORIGIN });

	it('201 → ok: stamps lastSuccessAt, resets failureCount, sets lastNotifiedOn', async () => {
		const sub = seedSub();
		const sender = makeSender({ status: 201 });

		const outcome = await sendToSubscription(db, sub, PAYLOAD, VAPID, {
			sender,
			now: FIXED_NOW,
			today: TODAY
		});

		expect(outcome).toBe('ok');
		const row = getById(db, sub.id);
		expect(row?.lastSuccessAt?.getTime()).toBe(FIXED_NOW.getTime());
		expect(row?.failureCount).toBe(0);
		expect(row?.lastNotifiedOn).toBe(TODAY);
	});

	it('passes the correct target (endpoint + keys), payload and vapid to the sender', async () => {
		const sub = seedSub();
		const sender = makeSender({ status: 201 });

		await sendToSubscription(db, sub, PAYLOAD, VAPID, { sender, now: FIXED_NOW, today: TODAY });

		expect(sender.calls).toHaveLength(1);
		const call = sender.calls[0];
		expect(call.target).toEqual({
			endpoint: SUB_A.endpoint,
			keys: { p256dh: 'p256dh-a', auth: 'auth-a' }
		});
		expect(call.payload).toBe(PAYLOAD);
		expect(call.vapid).toBe(VAPID);
	});

	it('204 → ok (2xx is treated as success)', async () => {
		const sub = seedSub();
		const sender = makeSender({ status: 204 });
		const outcome = await sendToSubscription(db, sub, PAYLOAD, VAPID, {
			sender,
			now: FIXED_NOW,
			today: TODAY
		});
		expect(outcome).toBe('ok');
		expect(getById(db, sub.id)?.lastNotifiedOn).toBe(TODAY);
	});

	it('410 → pruned: the row is deleted', async () => {
		const sub = seedSub();
		const sender = makeSender({ status: 410 });
		const outcome = await sendToSubscription(db, sub, PAYLOAD, VAPID, {
			sender,
			now: FIXED_NOW,
			today: TODAY
		});
		expect(outcome).toBe('pruned');
		expect(getById(db, sub.id)).toBeUndefined();
	});

	it('404 → pruned: the row is deleted', async () => {
		const sub = seedSub();
		const sender = makeSender({ status: 404 });
		const outcome = await sendToSubscription(db, sub, PAYLOAD, VAPID, {
			sender,
			now: FIXED_NOW,
			today: TODAY
		});
		expect(outcome).toBe('pruned');
		expect(getById(db, sub.id)).toBeUndefined();
	});

	it('500 → failed: failureCount incremented, row remains', async () => {
		const sub = seedSub();
		const sender = makeSender({ status: 500 });
		const outcome = await sendToSubscription(db, sub, PAYLOAD, VAPID, {
			sender,
			now: FIXED_NOW,
			today: TODAY
		});
		expect(outcome).toBe('failed');
		const row = getById(db, sub.id);
		expect(row).not.toBeNull();
		expect(row?.failureCount).toBe(1);
		expect(row?.lastNotifiedOn).toBeNull(); // not marked notified
	});

	it('sender throws → failed: failureCount incremented, row remains, no rethrow', async () => {
		const sub = seedSub();
		const sender = makeSender({ throws: true });
		const outcome = await sendToSubscription(db, sub, PAYLOAD, VAPID, {
			sender,
			now: FIXED_NOW,
			today: TODAY
		});
		expect(outcome).toBe('failed');
		expect(getById(db, sub.id)?.failureCount).toBe(1);
	});
});

// ── isSafePushEndpoint (SSRF guard) ─────────────────────────────────────────

describe('isSafePushEndpoint', () => {
	it('accepts public https push endpoints', () => {
		expect(isSafePushEndpoint('https://fcm.googleapis.com/fcm/send/abc')).toBe(true);
		expect(isSafePushEndpoint('https://web.push.apple.com/xyz')).toBe(true);
		expect(isSafePushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/g')).toBe(true);
	});

	it('rejects non-https', () => {
		expect(isSafePushEndpoint('http://fcm.googleapis.com/x')).toBe(false);
		expect(isSafePushEndpoint('ftp://example.com')).toBe(false);
	});

	it('rejects loopback / private / link-local / metadata hosts', () => {
		expect(isSafePushEndpoint('https://localhost/x')).toBe(false);
		expect(isSafePushEndpoint('https://127.0.0.1/x')).toBe(false);
		expect(isSafePushEndpoint('https://10.0.0.5/x')).toBe(false);
		expect(isSafePushEndpoint('https://172.16.0.1/x')).toBe(false);
		expect(isSafePushEndpoint('https://192.168.1.1/x')).toBe(false);
		expect(isSafePushEndpoint('https://169.254.169.254/latest/meta-data')).toBe(false);
		expect(isSafePushEndpoint('https://[::1]/x')).toBe(false);
	});

	it('rejects garbage', () => {
		expect(isSafePushEndpoint('not a url')).toBe(false);
		expect(isSafePushEndpoint('')).toBe(false);
	});
});

// ── send-time SSRF guard ────────────────────────────────────────────────────
describe('sendToSubscription SSRF guard (send-time re-validation)', () => {
	let db: DB;
	beforeEach(() => {
		db = makeDb();
		makeUser(db, 'user-a');
	});

	const PAYLOAD = buildDailyPayload({ count: 1, locale: 'fr', origin: ORIGIN });

	it('refuses to send to a stored unsafe endpoint and never calls the sender', async () => {
		// saveSubscription does not validate, so a private endpoint can be persisted.
		saveSubscription(db, 'user-a', {
			endpoint: 'https://127.0.0.1/x',
			keys: { p256dh: 'p', auth: 'a' }
		});
		const sub = listSubscriptionsForUser(db, 'user-a')[0];
		const sender = makeSender({ status: 201 });

		const outcome = await sendToSubscription(db, sub, PAYLOAD, VAPID, {
			sender,
			now: FIXED_NOW,
			today: TODAY
		});

		expect(outcome).toBe('failed');
		expect(sender.calls).toHaveLength(0);
		expect(getById(db, sub.id)?.failureCount).toBe(1);
	});

	it('refuses when the host resolves to a private IP (DNS rebinding), no send', async () => {
		saveSubscription(db, 'user-a', SUB_A);
		const sub = listSubscriptionsForUser(db, 'user-a')[0];
		const sender = makeSender({ status: 201 });

		const outcome = await sendToSubscription(db, sub, PAYLOAD, VAPID, {
			sender,
			now: FIXED_NOW,
			today: TODAY,
			resolve: async () => ['10.0.0.5']
		});

		expect(outcome).toBe('failed');
		expect(sender.calls).toHaveLength(0);
	});

	it('sends when the host resolves to a public IP', async () => {
		saveSubscription(db, 'user-a', SUB_A);
		const sub = listSubscriptionsForUser(db, 'user-a')[0];
		const sender = makeSender({ status: 201 });

		const outcome = await sendToSubscription(db, sub, PAYLOAD, VAPID, {
			sender,
			now: FIXED_NOW,
			today: TODAY,
			resolve: async () => ['93.184.216.34']
		});

		expect(outcome).toBe('ok');
		expect(sender.calls).toHaveLength(1);
	});
});

describe('isEndpointSendable', () => {
	it('mirrors isSafePushEndpoint when no resolver is given', async () => {
		expect(await isEndpointSendable('https://fcm.googleapis.com/x')).toBe(true);
		expect(await isEndpointSendable('http://fcm.googleapis.com/x')).toBe(false);
		expect(await isEndpointSendable('https://127.0.0.1/x')).toBe(false);
	});

	it('rejects when any resolved IP is private/loopback/link-local', async () => {
		expect(
			await isEndpointSendable('https://evil.example/x', async () => ['169.254.169.254'])
		).toBe(false);
		expect(
			await isEndpointSendable('https://evil.example/x', async () => ['93.184.216.34', '10.0.0.1'])
		).toBe(false);
	});

	it('accepts a host that resolves only to public IPs; rejects unresolvable', async () => {
		expect(
			await isEndpointSendable('https://fcm.googleapis.com/x', async () => ['142.250.1.1'])
		).toBe(true);
		expect(await isEndpointSendable('https://nx.example/x', async () => [])).toBe(false);
	});

	it('skips DNS for a public IP-literal endpoint (already vetted)', async () => {
		let called = false;
		const ok = await isEndpointSendable('https://93.184.216.34/x', async () => {
			called = true;
			return [];
		});
		expect(ok).toBe(true);
		expect(called).toBe(false);
	});
});

describe('saveSubscription per-user cap', () => {
	it('keeps at most 20 subscriptions per user, evicting oldest', () => {
		const path = join(tmpdir(), `push-cap-${crypto.randomUUID()}.db`);
		const { db } = createDb(path);
		runMigrations(db);
		db.insert(users)
			.values({ id: 'capuser', email: 'cap@ex.test', displayName: 'cap', createdAt: new Date() })
			.run();
		for (let i = 0; i < 25; i++) {
			saveSubscription(
				db,
				'capuser',
				{ endpoint: `https://push.example/${i}`, keys: { p256dh: 'p', auth: 'a' } },
				`d${i}`
			);
		}
		expect(listSubscriptionsForUser(db, 'capuser').length).toBe(20);
	});
});
