import { eq, and, or, like, asc, sql } from 'drizzle-orm';
import type { DB } from './db/client';
import { foods, shelfLives } from './db/schema';

// ── Types ─────────────────────────────────────────────────────────────────────

type Food = typeof foods.$inferSelect;
type ShelfLife = typeof shelfLives.$inferSelect;

export type FoodSearchResult = {
	food: Food;
	defaultShelfLife?: ShelfLife;
};

export type BestByResult = { date: Date; isEstimate: true } | { date: null; guidance: true };

// ── Unit constants ─────────────────────────────────────────────────────────────

export const UNIT_MS: Record<'hours' | 'days' | 'weeks' | 'months' | 'years', number> = {
	hours: 3_600_000,
	days: 86_400_000,
	weeks: 7 * 86_400_000,
	months: 30 * 86_400_000,
	years: 365 * 86_400_000
};

// ── searchFoods ────────────────────────────────────────────────────────────────

/**
 * Search for foods by name or keywords in the given locale (case-insensitive).
 * An empty query returns the first 20 foods ordered by localized name.
 * For each result, attaches the shelf_life row whose location matches the
 * food's defaultLocation (if any).
 */
export function searchFoods(db: DB, query: string, locale: 'fr' | 'en'): FoodSearchResult[] {
	const trimmed = query.trim().toLowerCase();

	let rows: Food[];

	if (trimmed === '') {
		// Return first 20 foods ordered by localized name
		rows = db
			.select()
			.from(foods)
			.orderBy(locale === 'fr' ? asc(foods.nameFr) : asc(foods.nameEn))
			.limit(20)
			.all();
	} else {
		const pattern = `%${trimmed}%`;

		if (locale === 'fr') {
			rows = db
				.select()
				.from(foods)
				.where(
					or(
						like(sql`lower(${foods.nameFr})`, pattern),
						like(sql`lower(${foods.keywordsFr})`, pattern)
					)
				)
				.orderBy(asc(foods.nameFr))
				.limit(20)
				.all();
		} else {
			rows = db
				.select()
				.from(foods)
				.where(
					or(
						like(sql`lower(${foods.nameEn})`, pattern),
						like(sql`lower(${foods.keywordsEn})`, pattern)
					)
				)
				.orderBy(asc(foods.nameEn))
				.limit(20)
				.all();
		}
	}

	// For each food, fetch the shelf_life matching its defaultLocation
	return rows.map((food) => {
		const defaultShelfLife =
			db
				.select()
				.from(shelfLives)
				.where(and(eq(shelfLives.foodId, food.id), eq(shelfLives.location, food.defaultLocation)))
				.get() ?? undefined;

		return { food, defaultShelfLife };
	});
}

// ── tipForItem ─────────────────────────────────────────────────────────────────

/**
 * The storage tip to show for an inventory item, by its food + location.
 * Prefers the purchase-basis row (the basis estimates are computed from), then
 * any row with a tip. Returns the localized text, or null when none exists.
 */
export function tipForItem(
	db: DB,
	foodId: string,
	location: 'pantry' | 'fridge' | 'freezer',
	locale: 'fr' | 'en'
): string | null {
	const rows = db
		.select()
		.from(shelfLives)
		.where(and(eq(shelfLives.foodId, foodId), eq(shelfLives.location, location)))
		.all();

	const withTip = (r: ShelfLife) => (locale === 'fr' ? r.tipsFr : r.tipsEn);
	const preferred =
		rows.find((r) => r.basis === 'purchase' && withTip(r)) ?? rows.find((r) => withTip(r));
	return preferred ? withTip(preferred) || null : null;
}

// ── openedEstimate ─────────────────────────────────────────────────────────────

/**
 * Return the best-by Date computed from the opened-basis shelf life for the
 * given food + location, using openedAt as the clock start.
 * Returns null if no opened-basis row exists or if the row is notRecommended.
 */
export function openedEstimate(
	db: DB,
	foodId: string,
	location: 'pantry' | 'fridge' | 'freezer',
	openedAt: Date
): Date | null {
	const sl = db
		.select()
		.from(shelfLives)
		.where(
			and(
				eq(shelfLives.foodId, foodId),
				eq(shelfLives.location, location),
				eq(shelfLives.basis, 'opened')
			)
		)
		.get();
	if (!sl) return null;
	const result = computeBestBy(sl, openedAt);
	return 'date' in result && result.date !== null ? result.date : null;
}

// ── computeBestBy ──────────────────────────────────────────────────────────────

/**
 * Estimate the best-by date for a food item based on its shelf_life data.
 *
 * - If the shelf_life is marked notRecommended, storage is not recommended:
 *   return { date: null, guidance: true }.
 * - Otherwise compute: addedAt + midpoint(min, max) * UNIT_MS[unit]
 *   where midpoint = (min + max) / 2.
 */
export function computeBestBy(
	shelfLife: Pick<ShelfLife, 'min' | 'max' | 'unit' | 'notRecommended'>,
	addedAt: Date
): BestByResult {
	if (shelfLife.notRecommended) {
		return { date: null, guidance: true };
	}

	const midpointMs = ((shelfLife.min + shelfLife.max) / 2) * UNIT_MS[shelfLife.unit];
	const date = new Date(addedAt.getTime() + midpointMs);
	return { date, isEstimate: true };
}
