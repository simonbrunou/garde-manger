import { sql, and, eq, isNotNull } from 'drizzle-orm';
import type { DB } from './db/client';
import { inventoryItems, households, memberships } from './db/schema';

// Drizzle's integer({ mode: 'timestamp' }) columns (use_by/best_by, and the
// generated effective_date) are stored as Unix SECONDS — so the raw-SQL cutoff
// below must be computed in seconds too.
const SECONDS_PER_DAY = 86_400;

export interface UserNotify {
	userId: string;
	count: number;
}

/**
 * Per user, count the `active` inventory items — across ALL households they
 * belong to — that are approaching or past their effective date, honouring each
 * household's own `warn_days` window. Mirrors `bandFor`'s urgent+soon bands:
 * an item qualifies when `startOfDay(effectiveDate) <= startOfDay(today) +
 * warn_days·day`, which on the raw ms-epoch column is equivalent to
 * `effective_date < todayStart + (warn_days + 1)·day` (includes everything
 * past-due, since there is no lower bound). Items with no date are excluded.
 *
 * Returns one entry per user with count > 0. `now` is injected for determinism.
 */
export function usersToNotify(db: DB, now: Date): UserNotify[] {
	const todayStartSec = Math.floor(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000
	);

	const rows = db
		.select({ userId: memberships.userId, count: sql<number>`count(*)` })
		.from(inventoryItems)
		.innerJoin(households, eq(households.id, inventoryItems.householdId))
		.innerJoin(memberships, eq(memberships.householdId, inventoryItems.householdId))
		.where(
			and(
				eq(inventoryItems.status, 'active'),
				isNotNull(inventoryItems.effectiveDate),
				sql`${inventoryItems.effectiveDate} < ${todayStartSec} + (${households.warnDays} + 1) * ${SECONDS_PER_DAY}`
			)
		)
		.groupBy(memberships.userId)
		.all();

	return rows.filter((r) => r.count > 0);
}
