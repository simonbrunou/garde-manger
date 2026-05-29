import { eq, and, asc, sql } from 'drizzle-orm';
import type { DB } from './db/client';
import { inventoryItems } from './db/schema';

// ── Types ─────────────────────────────────────────────────────────────────────

type InventoryItem = typeof inventoryItems.$inferSelect;

export type Band = 'urgent' | 'soon' | 'ok';

// ── addFresh ──────────────────────────────────────────────────────────────────

/**
 * Add a fresh food item (identified by foodId) to a household's inventory.
 * kind = 'fresh', customName = null.
 */
export function addFresh(
	db: DB,
	params: {
		householdId: string;
		addedBy: string;
		foodId: string;
		location: 'pantry' | 'fridge' | 'freezer';
		bestByDate?: Date;
		isEstimate?: boolean;
		quantity?: number;
	}
): InventoryItem {
	const now = new Date();
	const id = crypto.randomUUID();

	db.insert(inventoryItems)
		.values({
			id,
			householdId: params.householdId,
			addedBy: params.addedBy,
			kind: 'fresh',
			foodId: params.foodId,
			customName: null,
			quantity: params.quantity ?? 1,
			location: params.location,
			addedAt: now,
			bestByDate: params.bestByDate ?? null,
			isEstimate: params.isEstimate ?? false,
			status: 'active'
		})
		.run();

	const row = db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).get();
	if (!row) {
		throw new Error(`Failed to retrieve inserted inventory item ${id}`);
	}
	return row;
}

// ── addCustom ─────────────────────────────────────────────────────────────────

/**
 * Add a custom-named item (no food catalogue entry) to a household's inventory.
 * kind = 'fresh', foodId = null.
 */
export function addCustom(
	db: DB,
	params: {
		householdId: string;
		addedBy: string;
		customName: string;
		location: 'pantry' | 'fridge' | 'freezer';
		useByDate?: Date;
		bestByDate?: Date;
		quantity?: number;
	}
): InventoryItem {
	const now = new Date();
	const id = crypto.randomUUID();

	db.insert(inventoryItems)
		.values({
			id,
			householdId: params.householdId,
			addedBy: params.addedBy,
			kind: 'fresh',
			foodId: null,
			customName: params.customName,
			quantity: params.quantity ?? 1,
			location: params.location,
			addedAt: now,
			useByDate: params.useByDate ?? null,
			bestByDate: params.bestByDate ?? null,
			isEstimate: false,
			status: 'active'
		})
		.run();

	const row = db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).get();
	if (!row) {
		throw new Error(`Failed to retrieve inserted inventory item ${id}`);
	}
	return row;
}

// ── listActive ────────────────────────────────────────────────────────────────

/**
 * List all active inventory items for a household, ordered by effectiveDate ASC
 * with NULLs last (items with no date come after dated items).
 * Optionally filter by location.
 */
export function listActive(
	db: DB,
	householdId: string,
	opts?: { location?: 'pantry' | 'fridge' | 'freezer' }
): InventoryItem[] {
	const conditions = [
		eq(inventoryItems.householdId, householdId),
		eq(inventoryItems.status, 'active')
	];

	if (opts?.location) {
		conditions.push(eq(inventoryItems.location, opts.location));
	}

	return (
		db
			.select()
			.from(inventoryItems)
			.where(and(...conditions))
			// NULLs last: rows where effectiveDate IS NULL sort after those with a date.
			// SQLite NULLS LAST is achieved via two sort keys:
			//   1. (effectiveDate IS NULL) — 0 for dated rows, 1 for NULL rows → NULLs last
			//   2. effectiveDate ASC       — orders the dated rows among themselves
			.orderBy(
				asc(sql`(${inventoryItems.effectiveDate} IS NULL)`),
				asc(inventoryItems.effectiveDate)
			)
			.all()
	);
}

// ── getItem ───────────────────────────────────────────────────────────────────

/**
 * Retrieve a single inventory item by id. Returns undefined if not found.
 */
export function getItem(db: DB, id: string): InventoryItem | undefined {
	return db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).get() ?? undefined;
}

// ── setStatus ─────────────────────────────────────────────────────────────────

/**
 * Update an item's status and set closedAt to now, scoped to the given household.
 * Returns the updated row, or undefined if no item with that id belongs to that household.
 */
export function setStatus(
	db: DB,
	{ id, householdId, status }: { id: string; householdId: string; status: 'consumed' | 'discarded' }
): InventoryItem | undefined {
	const now = new Date();

	const updated = db
		.update(inventoryItems)
		.set({ status, closedAt: now })
		.where(and(eq(inventoryItems.id, id), eq(inventoryItems.householdId, householdId)))
		.returning()
		.get();

	return updated ?? undefined;
}

// ── bandFor ───────────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

/**
 * Classify an item's urgency based on its effectiveDate.
 *
 * - null effectiveDate → 'ok'
 * - effectiveDate <= now (start-of-day comparison) → 'urgent'
 * - effectiveDate <= now + warnDays → 'soon'
 * - otherwise → 'ok'
 */
export function bandFor(effectiveDate: Date | null, warnDays: number, now: Date): Band {
	if (effectiveDate === null) {
		return 'ok';
	}

	// Start-of-day for both dates (UTC midnight) for clean comparison
	const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
	const effectiveStart = new Date(
		Date.UTC(
			effectiveDate.getUTCFullYear(),
			effectiveDate.getUTCMonth(),
			effectiveDate.getUTCDate()
		)
	);

	if (effectiveStart <= todayStart) {
		return 'urgent';
	}

	const warnBoundary = new Date(todayStart.getTime() + warnDays * MS_PER_DAY);
	if (effectiveStart <= warnBoundary) {
		return 'soon';
	}

	return 'ok';
}
