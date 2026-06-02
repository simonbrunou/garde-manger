import { timingSafeEqual, createHash } from 'node:crypto';
import { inArray } from 'drizzle-orm';
import type { DB } from './db/client';
import { users } from './db/schema';
import { usersToNotify } from './reminders';
import {
	buildDailyPayload,
	listSubscriptionsForUser,
	sendToSubscription,
	type PushSender,
	type Vapid,
	type HostResolver
} from './push';

/**
 * Result of one daily-reminder run. Contains ONLY aggregate counts — never user
 * data, emails or endpoints — so it is safe to log and to return from the cron
 * endpoint.
 */
export interface DailyReminderSummary {
	usersNotified: number; // users for whom at least one device was sent
	devicesSent: number; // 'ok' sends
	pruned: number; // subscriptions deleted (404/410)
	failed: number; // failed sends
	skipped: number; // devices skipped because already notified today
}

/**
 * Pure orchestration of the daily expiry reminder: find users with expiring
 * items, and for each of their devices that hasn't already been notified today,
 * send a localized Web Push and apply the subscription lifecycle.
 *
 * Idempotent: `lastNotifiedOn` gates per-device, so running twice in the same
 * UTC day never double-sends. Never throws on an individual send failure
 * (`sendToSubscription` swallows). No `$env`/`$app` imports — config (vapid,
 * sender, origin, now) is injected so this stays unit-testable.
 */
export async function runDailyReminders(
	db: DB,
	opts: { vapid: Vapid; sender: PushSender; origin: string; now?: Date; resolve?: HostResolver }
): Promise<DailyReminderSummary> {
	const now = opts.now ?? new Date();
	const today = now.toISOString().slice(0, 10);

	const summary: DailyReminderSummary = {
		usersNotified: 0,
		devicesSent: 0,
		pruned: 0,
		failed: 0,
		skipped: 0
	};

	const targets = usersToNotify(db, now);
	if (targets.length === 0) return summary;

	// Batch-fetch locales for exactly the users we will notify (default 'fr').
	const localeById = new Map<string, 'fr' | 'en'>();
	const localeRows = db
		.select({ id: users.id, locale: users.locale })
		.from(users)
		.where(
			inArray(
				users.id,
				targets.map((t) => t.userId)
			)
		)
		.all();
	for (const row of localeRows) localeById.set(row.id, row.locale);

	for (const target of targets) {
		const locale = localeById.get(target.userId) ?? 'fr';
		const subs = listSubscriptionsForUser(db, target.userId);
		const payload = buildDailyPayload({ count: target.count, locale, origin: opts.origin });

		let okForUser = 0;
		for (const sub of subs) {
			if (sub.lastNotifiedOn === today) {
				summary.skipped++;
				continue;
			}
			const outcome = await sendToSubscription(db, sub, payload, opts.vapid, {
				sender: opts.sender,
				now,
				today,
				resolve: opts.resolve
			});
			if (outcome === 'ok') {
				summary.devicesSent++;
				okForUser++;
			} else if (outcome === 'pruned') {
				summary.pruned++;
			} else {
				summary.failed++;
			}
		}
		if (okForUser > 0) summary.usersNotified++;
	}

	return summary;
}

/**
 * Constant-time comparison of a cron secret. Both sides are hashed to fixed-size
 * SHA-256 digests before comparing, so the comparison is fully length-independent
 * (no length-based early return that could leak the secret's length via timing).
 * Only an absent presented value short-circuits.
 */
export function secretMatches(expected: string, presented: string | null | undefined): boolean {
	if (!expected || presented == null) return false;
	const a = createHash('sha256').update(expected, 'utf8').digest();
	const b = createHash('sha256').update(presented, 'utf8').digest();
	return timingSafeEqual(a, b);
}
