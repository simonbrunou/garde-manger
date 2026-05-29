import { error, redirect, fail } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '$lib/server/db';
import { requireMembership, MembershipError, listForUser } from '$lib/server/households';
import { searchFoods, computeBestBy } from '$lib/server/catalogue';
import { addFresh, addCustom } from '$lib/server/inventory';
import { foods, shelfLives } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { m } from '$lib/i18n';
import type { PageServerLoad, Actions } from './$types';

const HOUSEHOLD_COOKIE = 'gm_household';

function resolveActiveHouseholdId(
	cookieId: string | null,
	households: { id: string }[]
): string | null {
	const ids = households.map((h) => h.id);
	return cookieId && ids.includes(cookieId) ? cookieId : (households[0]?.id ?? null);
}

// ── Load ──────────────────────────────────────────────────────────────────────

export const load: PageServerLoad = async ({ parent, locals, url }) => {
	const { activeHouseholdId, locale } = await parent();

	if (!activeHouseholdId) {
		return { noHousehold: true as const, locale };
	}

	try {
		requireMembership(db, activeHouseholdId, locals.user!.id);
	} catch (e) {
		if (e instanceof MembershipError) {
			error(403, 'Forbidden');
		}
		throw e;
	}

	const q = url.searchParams.get('q') ?? '';
	const foodId = url.searchParams.get('food') ?? null;

	// Search results
	const results = searchFoods(db, q, locale);

	// Load selected food + all its shelf lives
	let selectedFood: typeof foods.$inferSelect | null = null;
	let allShelfLives: (typeof shelfLives.$inferSelect)[] = [];

	if (foodId) {
		selectedFood = db.select().from(foods).where(eq(foods.id, foodId)).get() ?? null;

		if (selectedFood) {
			allShelfLives = db.select().from(shelfLives).where(eq(shelfLives.foodId, foodId)).all();
		}
	}

	// Compute estimate per location for display
	type LocationEstimate = {
		location: 'pantry' | 'fridge' | 'freezer';
		date: string | null;
		isEstimate: boolean;
		guidance: boolean;
		noData: boolean;
	};

	let locationEstimates: LocationEstimate[] = [];
	if (selectedFood) {
		const locations: Array<'pantry' | 'fridge' | 'freezer'> = ['pantry', 'fridge', 'freezer'];
		const now = new Date();
		locationEstimates = locations.map((loc) => {
			const sl = allShelfLives.find((s) => s.location === loc);
			if (!sl) {
				return { location: loc, date: null, isEstimate: false, guidance: false, noData: true };
			}
			const result = computeBestBy(sl, now);
			if ('guidance' in result) {
				return { location: loc, date: null, isEstimate: false, guidance: true, noData: false };
			}
			return {
				location: loc,
				date: result.date.toISOString().slice(0, 10),
				isEstimate: result.isEstimate,
				guidance: false,
				noData: false
			};
		});
	}

	// Default estimate for the food's defaultLocation
	const defaultEstimate = selectedFood
		? (locationEstimates.find((e) => e.location === selectedFood!.defaultLocation) ?? null)
		: null;

	return {
		noHousehold: false as const,
		locale,
		activeHouseholdId,
		q,
		results,
		selectedFood,
		allShelfLives,
		locationEstimates,
		defaultEstimate
	};
};

// ── Validation schemas ─────────────────────────────────────────────────────────

const locationSchema = v.picklist(['pantry', 'fridge', 'freezer'] as const);

const addFreshSchema = v.object({
	foodId: v.pipe(v.string(), v.minLength(1, 'foodId requis')),
	location: locationSchema,
	bestByDate: v.optional(v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'))),
	quantity: v.optional(v.pipe(v.string(), v.regex(/^\d+$/, 'Quantité invalide')))
});

const addCustomSchema = v.object({
	customName: v.pipe(v.string(), v.trim(), v.minLength(1, 'Nom requis'), v.maxLength(120)),
	location: locationSchema,
	bestByDate: v.optional(v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'))),
	useByDate: v.optional(v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'))),
	quantity: v.optional(v.pipe(v.string(), v.regex(/^\d+$/, 'Quantité invalide')))
});

// ── Actions ───────────────────────────────────────────────────────────────────

export const actions: Actions = {
	addFresh: async ({ request, locals, cookies }) => {
		const t = m(locals.locale);
		const userId = locals.user!.id;

		// Resolve active household the same way the layout does
		const households = listForUser(db, userId);
		const cookieId = cookies.get(HOUSEHOLD_COOKIE) ?? null;
		const activeHouseholdId = resolveActiveHouseholdId(cookieId, households);

		if (!activeHouseholdId) {
			return fail(400, { message: t.add_no_household });
		}

		try {
			requireMembership(db, activeHouseholdId, userId);
		} catch (e) {
			if (e instanceof MembershipError) {
				error(403, 'Forbidden');
			}
			throw e;
		}

		const data = await request.formData();
		const raw: Record<string, unknown> = {
			foodId: (data.get('foodId') as string | null) ?? '',
			location: (data.get('location') as string | null) ?? ''
		};
		const bestByDateRaw = (data.get('bestByDate') as string | null) ?? '';
		const quantityRaw = (data.get('quantity') as string | null) ?? '';
		if (bestByDateRaw) raw.bestByDate = bestByDateRaw;
		if (quantityRaw) raw.quantity = quantityRaw;

		const parsed = v.safeParse(addFreshSchema, raw);
		if (!parsed.success) {
			const msg = parsed.issues[0]?.message ?? t.add_error_generic;
			return fail(400, { message: msg });
		}

		const { foodId, location, bestByDate, quantity } = parsed.output;

		// Load the food
		const food = db.select().from(foods).where(eq(foods.id, foodId)).get();
		if (!food) {
			return fail(400, { message: t.add_food_not_found });
		}

		const now = new Date();
		let resolvedBestByDate: Date | undefined;
		let isEstimate = false;

		if (bestByDate) {
			// User provided an explicit override date — not an estimate
			resolvedBestByDate = new Date(bestByDate + 'T12:00:00Z');
			isEstimate = false;
		} else {
			// Compute from shelf life for the chosen location
			const sl = db
				.select()
				.from(shelfLives)
				.where(
					and(
						eq(shelfLives.foodId, foodId),
						eq(shelfLives.location, location as 'pantry' | 'fridge' | 'freezer')
					)
				)
				.get();

			if (sl) {
				const result = computeBestBy(sl, now);
				if ('date' in result && result.date !== null) {
					resolvedBestByDate = result.date;
					isEstimate = result.isEstimate;
				}
				// else guidance/no date → add without date, isEstimate stays false
			}
		}

		addFresh(db, {
			householdId: activeHouseholdId,
			addedBy: userId,
			foodId,
			location: location as 'pantry' | 'fridge' | 'freezer',
			bestByDate: resolvedBestByDate,
			isEstimate,
			quantity: quantity ? parseInt(quantity, 10) : 1
		});

		redirect(303, '/');
	},

	addCustom: async ({ request, locals, cookies }) => {
		const t = m(locals.locale);
		const userId = locals.user!.id;

		const households = listForUser(db, userId);
		const cookieId = cookies.get(HOUSEHOLD_COOKIE) ?? null;
		const activeHouseholdId = resolveActiveHouseholdId(cookieId, households);

		if (!activeHouseholdId) {
			return fail(400, { message: t.add_no_household });
		}

		try {
			requireMembership(db, activeHouseholdId, userId);
		} catch (e) {
			if (e instanceof MembershipError) {
				error(403, 'Forbidden');
			}
			throw e;
		}

		const data = await request.formData();
		const raw: Record<string, unknown> = {
			customName: (data.get('customName') as string | null) ?? '',
			location: (data.get('location') as string | null) ?? ''
		};
		const bestByDateRaw = (data.get('bestByDate') as string | null) ?? '';
		const useByDateRaw = (data.get('useByDate') as string | null) ?? '';
		const quantityRaw = (data.get('quantity') as string | null) ?? '';
		if (bestByDateRaw) raw.bestByDate = bestByDateRaw;
		if (useByDateRaw) raw.useByDate = useByDateRaw;
		if (quantityRaw) raw.quantity = quantityRaw;

		const parsed = v.safeParse(addCustomSchema, raw);
		if (!parsed.success) {
			const msg = parsed.issues[0]?.message ?? t.add_error_generic;
			return fail(400, { message: msg });
		}

		const { customName, location, bestByDate, useByDate, quantity } = parsed.output;

		addCustom(db, {
			householdId: activeHouseholdId,
			addedBy: userId,
			customName,
			location: location as 'pantry' | 'fridge' | 'freezer',
			bestByDate: bestByDate ? new Date(bestByDate + 'T12:00:00Z') : undefined,
			useByDate: useByDate ? new Date(useByDate + 'T12:00:00Z') : undefined,
			quantity: quantity ? parseInt(quantity, 10) : 1
		});

		redirect(303, '/');
	}
};
