import { eq, and } from 'drizzle-orm';
import type { DB } from './db/client';
import { pushSubscriptions } from './db/schema';

// ── Types ─────────────────────────────────────────────────────────────────────

/** The shape a push service expects: an endpoint plus the client's encryption keys. */
export interface WebPushTarget {
	endpoint: string;
	keys: { p256dh: string; auth: string };
}

/** VAPID identity for signing the push request. */
export interface Vapid {
	publicKey: string;
	privateKey: string;
	subject: string; // 'mailto:...' or an https origin
}

export interface PushSender {
	/**
	 * Resolves to the HTTP status code returned by the push service
	 * (201/204 = ok, 404/410 = gone). Maps transport-level rejections to a status
	 * code where possible, or rethrows truly unexpected (programmer) errors.
	 */
	send(
		target: WebPushTarget,
		payload: string,
		opts: { vapid: Vapid; ttl?: number }
	): Promise<number>;
}

// The Web Push protocol caps the encrypted payload; the declarative JSON must
// stay comfortably under this. We enforce it as a safety net (counts are tiny).
const MAX_PAYLOAD_BYTES = 3072;

// ── buildDailyPayload (pure) ────────────────────────────────────────────────────

interface DailyCopy {
	title: string;
	body: (count: number) => string;
}

const COPY: Record<'fr' | 'en', DailyCopy> = {
	fr: {
		title: 'Garde-Manger',
		body: (count) => `${count} aliment(s) à consommer bientôt`
	},
	en: {
		title: 'Garde-Manger',
		body: (count) => `${count} item(s) to use soon`
	}
};

/**
 * Build the declarative Web Push JSON string. iOS 18.4+ renders this directly
 * (no service-worker JS needed), and it is the SAME payload the classic SW push
 * handler parses. The serialized result is guaranteed to be < 3072 bytes: if the
 * body would push it over, the body is truncated (a safety net only).
 */
export function buildDailyPayload(opts: {
	count: number;
	locale: 'fr' | 'en';
	origin: string;
}): string {
	const copy = COPY[opts.locale];
	const navigate = `${opts.origin}/?filter=expiring`;

	const build = (body: string): string =>
		JSON.stringify({
			web_push: 8030,
			notification: {
				title: copy.title,
				body,
				navigate,
				lang: opts.locale
			}
		});

	let body = copy.body(opts.count);
	let serialized = build(body);

	// Safety net: truncate the body until the whole payload fits. Counts are tiny
	// so this never fires in practice, but the guarantee must hold unconditionally.
	while (byteLength(serialized) >= MAX_PAYLOAD_BYTES && body.length > 0) {
		body = body.slice(0, -1);
		serialized = build(body);
	}

	return serialized;
}

function byteLength(s: string): number {
	return new TextEncoder().encode(s).byteLength;
}

// ── Subscription persistence ────────────────────────────────────────────────────

/**
 * UPSERT a subscription keyed by its (globally unique) endpoint. A device
 * re-subscribing refreshes its keys/owner/label rather than creating a duplicate.
 */
export function saveSubscription(
	db: DB,
	userId: string,
	sub: { endpoint: string; keys: { p256dh: string; auth: string } },
	deviceLabel?: string | null
): void {
	db.insert(pushSubscriptions)
		.values({
			id: crypto.randomUUID(),
			userId,
			endpoint: sub.endpoint,
			p256dh: sub.keys.p256dh,
			auth: sub.keys.auth,
			deviceLabel: deviceLabel ?? null,
			failureCount: 0,
			createdAt: new Date()
		})
		.onConflictDoUpdate({
			target: pushSubscriptions.endpoint,
			set: {
				userId,
				p256dh: sub.keys.p256dh,
				auth: sub.keys.auth,
				deviceLabel: deviceLabel ?? null
			}
		})
		.run();
}

/**
 * Delete a subscription by endpoint, scoped to its owner. A user must never be
 * able to delete another user's subscription (even if they know the endpoint).
 */
export function deleteSubscriptionByEndpoint(db: DB, userId: string, endpoint: string): void {
	db.delete(pushSubscriptions)
		.where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, userId)))
		.run();
}

/** All subscription rows owned by a user. */
export function listSubscriptionsForUser(
	db: DB,
	userId: string
): (typeof pushSubscriptions.$inferSelect)[] {
	return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)).all();
}

// ── sendToSubscription (lifecycle) ──────────────────────────────────────────────

export type SendOutcome = 'ok' | 'pruned' | 'failed';

/**
 * Send `payload` to one subscription row and apply its lifecycle:
 *  - 2xx (201/204)        → record success, reset failures, stamp lastNotifiedOn → 'ok'
 *  - 404/410 (gone)       → delete the row                                       → 'pruned'
 *  - any other status / a thrown sender error → increment failureCount, keep row → 'failed'
 *
 * Never throws: a single dead subscription must not abort a batch send.
 * `now` and `today` ('YYYY-MM-DD') are injected for determinism.
 */
export async function sendToSubscription(
	db: DB,
	sub: typeof pushSubscriptions.$inferSelect,
	payload: string,
	vapid: Vapid,
	deps: { sender: PushSender; now?: Date; today?: string }
): Promise<SendOutcome> {
	const now = deps.now ?? new Date();
	const today = deps.today ?? toIsoDate(now);

	const target: WebPushTarget = {
		endpoint: sub.endpoint,
		keys: { p256dh: sub.p256dh, auth: sub.auth }
	};

	let status: number;
	try {
		status = await deps.sender.send(target, payload, { vapid });
	} catch {
		// Transport blew up unexpectedly — treat as a soft failure, keep the row.
		incrementFailure(db, sub.id);
		return 'failed';
	}

	if (status >= 200 && status < 300) {
		db.update(pushSubscriptions)
			.set({ lastSuccessAt: now, failureCount: 0, lastNotifiedOn: today })
			.where(eq(pushSubscriptions.id, sub.id))
			.run();
		return 'ok';
	}

	if (status === 404 || status === 410) {
		db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id)).run();
		return 'pruned';
	}

	incrementFailure(db, sub.id);
	return 'failed';
}

function incrementFailure(db: DB, id: string): void {
	const row = db
		.select({ failureCount: pushSubscriptions.failureCount })
		.from(pushSubscriptions)
		.where(eq(pushSubscriptions.id, id))
		.get();
	if (!row) return;
	db.update(pushSubscriptions)
		.set({ failureCount: row.failureCount + 1 })
		.where(eq(pushSubscriptions.id, id))
		.run();
}

/** Format a Date as a UTC 'YYYY-MM-DD' string. */
function toIsoDate(d: Date): string {
	return d.toISOString().slice(0, 10);
}
