import { timingSafeEqual } from 'node:crypto';
import { inArray } from 'drizzle-orm';
import type { DB } from './db/client';
import { users } from './db/schema';
import { usersToNotify } from './reminders';
import {
	buildDailyPayload,
	listSubscriptionsForUser,
	sendToSubscription,
	type PushSender,
	type Vapid
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
	opts: { vapid: Vapid; sender: PushSender; origin: string; now?: Date }
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
				today
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
 * Constant-time, length-guarded comparison of a cron secret. An unequal length
 * (or an absent presented value) fails WITHOUT throwing, so callers never leak a
 * length oracle through an exception. `timingSafeEqual` requires equal-length
 * buffers, hence the explicit length guard before comparing.
 */
export function secretMatches(expected: string, presented: string | null | undefined): boolean {
	if (!expected || presented == null) return false;
	const a = Buffer.from(expected, 'utf8');
	const b = Buffer.from(presented, 'utf8');
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}
