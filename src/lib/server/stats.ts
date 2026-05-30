import { and, count, desc, eq, gte } from 'drizzle-orm';
import type { DB } from './db/client';
import { inventoryItems } from './db/schema';

export interface HouseholdStats {
	/** items marked consumed in the current calendar month (UTC) */
	eaten: number;
	/** items marked discarded in the current calendar month (UTC) */
	wasted: number;
	/** whole days since the most recent discard; null if nothing was ever discarded */
	streakDays: number | null;
}

const MS_PER_DAY = 86_400_000;

export function householdStats(db: DB, householdId: string, now: Date): HouseholdStats {
	const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

	const countBy = (status: 'consumed' | 'discarded'): number =>
		db
			.select({ c: count() })
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.householdId, householdId),
					eq(inventoryItems.status, status),
					gte(inventoryItems.closedAt, monthStart)
				)
			)
			.get()?.c ?? 0;

	const lastDiscard = db
		.select({ ts: inventoryItems.closedAt })
		.from(inventoryItems)
		.where(and(eq(inventoryItems.householdId, householdId), eq(inventoryItems.status, 'discarded')))
		.orderBy(desc(inventoryItems.closedAt))
		.limit(1)
		.get();

	let streakDays: number | null = null;
	if (lastDiscard?.ts) {
		const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
		const last = Date.UTC(
			lastDiscard.ts.getUTCFullYear(),
			lastDiscard.ts.getUTCMonth(),
			lastDiscard.ts.getUTCDate()
		);
		streakDays = Math.max(0, Math.round((today - last) / MS_PER_DAY));
	}

	return { eaten: countBy('consumed'), wasted: countBy('discarded'), streakDays };
}
