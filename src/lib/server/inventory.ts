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

// ── addPackaged ─────────────────────────────────────────────────────────────────

/**
 * Add a packaged item (identified by barcode) to a household's inventory.
 * kind = 'packaged', foodId = null. productName is snapshotted into customName
 * (useful for not_found products), useByDate is the DLC that drives the flow.
 */
export function addPackaged(
	db: DB,
	params: {
		householdId: string;
		addedBy: string;
		barcode: string;
		productName?: string | null; // stored in customName as a snapshot / for not_found products
		useByDate?: Date; // DLC — the hard date that is the point of the packaged flow
		quantity?: number;
		location: 'pantry' | 'fridge' | 'freezer';
		notes?: string | null;
	}
): InventoryItem {
	const now = new Date();
	const id = crypto.randomUUID();

	db.insert(inventoryItems)
		.values({
			id,
			householdId: params.householdId,
			addedBy: params.addedBy,
			kind: 'packaged',
			barcode: params.barcode,
			foodId: null,
			customName: params.productName ?? null,
			quantity: params.quantity ?? 1,
			location: params.location,
			addedAt: now,
			useByDate: params.useByDate ?? null,
			bestByDate: null,
			isEstimate: false,
			status: 'active',
			notes: params.notes ?? null
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

// ── getItemScoped ─────────────────────────────────────────────────────────────

/** Get an item only if it belongs to the given household. */
export function getItemScoped(
	db: DB,
	{ id, householdId }: { id: string; householdId: string }
): InventoryItem | undefined {
	return (
		db
			.select()
			.from(inventoryItems)
			.where(and(eq(inventoryItems.id, id), eq(inventoryItems.householdId, householdId)))
			.get() ?? undefined
	);
}

// ── updateItem ────────────────────────────────────────────────────────────────

/** Update mutable fields of an item, household-scoped. Returns the updated row or undefined. */
export function updateItem(
	db: DB,
	params: {
		id: string;
		householdId: string;
		location?: 'pantry' | 'fridge' | 'freezer';
		useByDate?: Date | null;
		bestByDate?: Date | null;
		quantity?: number;
		notes?: string | null;
	}
): InventoryItem | undefined {
	const set: Partial<typeof inventoryItems.$inferInsert> = {};
	if (params.location !== undefined) set.location = params.location;
	if (params.useByDate !== undefined) set.useByDate = params.useByDate;
	if (params.bestByDate !== undefined) set.bestByDate = params.bestByDate;
	if (params.quantity !== undefined) set.quantity = params.quantity;
	if (params.notes !== undefined) set.notes = params.notes;
	if (Object.keys(set).length === 0) return getItemScoped(db, params);

	return (
		db
			.update(inventoryItems)
			.set(set)
			.where(
				and(eq(inventoryItems.id, params.id), eq(inventoryItems.householdId, params.householdId))
			)
			.returning()
			.get() ?? undefined
	);
}

// ── deleteItem ────────────────────────────────────────────────────────────────

/** Hard-delete an item, household-scoped. Returns true if a row was deleted. */
export function deleteItem(
	db: DB,
	{ id, householdId }: { id: string; householdId: string }
): boolean {
	const rows = db
		.delete(inventoryItems)
		.where(and(eq(inventoryItems.id, id), eq(inventoryItems.householdId, householdId)))
		.returning()
		.all();
	return rows.length > 0;
}

// ── recordUse ─────────────────────────────────────────────────────────────────

/**
 * Record one unit consumed or discarded. Multi-unit rows decrement by one and
 * stay active; the last unit closes the row via setStatus. Household-scoped:
 * returns undefined if the item does not belong to the household.
 */
export function recordUse(
	db: DB,
	{
		id,
		householdId,
		outcome
	}: { id: string; householdId: string; outcome: 'consumed' | 'discarded' }
): InventoryItem | undefined {
	const item = getItemScoped(db, { id, householdId });
	if (!item) return undefined;
	if (item.quantity > 1) {
		return updateItem(db, { id, householdId, quantity: item.quantity - 1 });
	}
	return setStatus(db, { id, householdId, status: outcome });
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
