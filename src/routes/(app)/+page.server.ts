import { error, redirect } from '@sveltejs/kit';
import { inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { foods, products } from '$lib/server/db/schema';
import { requireMembership, MembershipError } from '$lib/server/households';
import { listActive, setStatus, bandFor } from '$lib/server/inventory';
import type { PageServerLoad, Actions } from './$types';
import type { Band } from '$lib/server/inventory';

// ── Types ─────────────────────────────────────────────────────────────────────

type Location = 'pantry' | 'fridge' | 'freezer';

export interface ItemRow {
	id: string;
	name: string;
	location: Location;
	dateKind: 'DLC' | 'DDM' | null;
	effectiveDate: string | null; // ISO date string for serialisation
	band: Band;
	quantity: number;
	barcode: string | null;
	imagePath: string | null; // relative path; null when none
	category: string | null;
}

interface Groups {
	urgent: ItemRow[];
	soon: ItemRow[];
	ok: ItemRow[];
}

// ── Load ──────────────────────────────────────────────────────────────────────

export const load: PageServerLoad = async ({ parent, locals, url }) => {
	const { activeHouseholdId, households, locale } = await parent();

	if (!activeHouseholdId) {
		return { noHousehold: true as const, locale };
	}

	const activeHousehold = households.find((h) => h.id === activeHouseholdId)!;

	try {
		requireMembership(db, activeHouseholdId, locals.user!.id);
	} catch (e) {
		if (e instanceof MembershipError) {
			error(403, 'Forbidden');
		}
		throw e;
	}

	// Parse optional ?location= filter
	const locationParam = url.searchParams.get('location');
	const location: Location | undefined =
		locationParam === 'pantry' || locationParam === 'fridge' || locationParam === 'freezer'
			? locationParam
			: undefined;

	// Fetch active items (already sorted: dated ASC, nulls last)
	const items = listActive(db, activeHouseholdId, { location });

	// Batch-fetch foods for all foodIds to avoid N+1
	const foodIds = [
		...new Set(items.map((i) => i.foodId).filter((id): id is string => id !== null))
	];
	const foodMap = new Map<string, typeof foods.$inferSelect>();
	if (foodIds.length > 0) {
		const foodRows = db.select().from(foods).where(inArray(foods.id, foodIds)).all();
		for (const f of foodRows) {
			foodMap.set(f.id, f);
		}
	}

	// Batch-fetch products for all barcodes to avoid N+1
	const barcodes = [...new Set(items.map((i) => i.barcode).filter((b): b is string => b !== null))];
	const productMap = new Map<string, typeof products.$inferSelect>();
	if (barcodes.length > 0) {
		const productRows = db.select().from(products).where(inArray(products.barcode, barcodes)).all();
		for (const p of productRows) {
			productMap.set(p.barcode, p);
		}
	}

	const now = new Date();
	const groups: Groups = { urgent: [], soon: [], ok: [] };

	for (const item of items) {
		// Resolve display name + image (packaged items resolve via the products cache)
		let name = '—';
		let imagePath: string | null = null;
		let category: string | null = null;
		if (item.foodId) {
			const food = foodMap.get(item.foodId);
			if (food) {
				name = locale === 'fr' ? food.nameFr : food.nameEn;
				category = food.category ?? null;
			}
		} else if (item.kind === 'packaged' && item.barcode && productMap.has(item.barcode)) {
			const product = productMap.get(item.barcode)!;
			name = product.name ?? item.customName ?? item.barcode ?? '—';
			imagePath = product.imagePath ?? null;
		} else if (item.customName) {
			name = item.customName;
		}

		// Determine date kind and effective date
		const dateKind: 'DLC' | 'DDM' | null = item.useByDate ? 'DLC' : item.bestByDate ? 'DDM' : null;

		const effectiveDate = item.effectiveDate ? item.effectiveDate.toISOString() : null;

		const band = bandFor(item.effectiveDate ?? null, activeHousehold.warnDays, now);

		const row: ItemRow = {
			id: item.id,
			name,
			location: item.location as Location,
			dateKind,
			effectiveDate,
			band,
			quantity: item.quantity,
			barcode: item.barcode,
			imagePath,
			category
		};

		groups[band].push(row);
	}

	// Deep-link target from the daily push: focus on items approaching their date.
	const expiringOnly = url.searchParams.get('filter') === 'expiring';

	const urgentCount = groups.urgent.length;
	const totalCount = groups.urgent.length + groups.soon.length + groups.ok.length;

	return {
		noHousehold: false as const,
		groups,
		activeHouseholdName: activeHousehold.name,
		locationFilter: location ?? null,
		expiringOnly,
		locale,
		urgentCount,
		totalCount
	};
};

// ── Actions ───────────────────────────────────────────────────────────────────

export const actions: Actions = {
	consume: async ({ request, locals, cookies, url }) => {
		const formData = await request.formData();
		const id = (formData.get('id') as string | null) ?? '';
		if (!id) error(400, 'Missing id');

		const activeHouseholdId = resolveActiveHouseholdId(cookies);
		if (!activeHouseholdId) error(400, 'No active household');

		try {
			requireMembership(db, activeHouseholdId, locals.user!.id);
		} catch (e) {
			if (e instanceof MembershipError) error(403, 'Forbidden');
			throw e;
		}

		const consumed = setStatus(db, { id, householdId: activeHouseholdId, status: 'consumed' });
		if (!consumed) error(404, 'Item not found in your active household');

		const locationParam = url.searchParams.get('location');
		const target = locationParam ? `/?location=${encodeURIComponent(locationParam)}` : '/';
		redirect(303, target);
	},

	discard: async ({ request, locals, cookies, url }) => {
		const formData = await request.formData();
		const id = (formData.get('id') as string | null) ?? '';
		if (!id) error(400, 'Missing id');

		const activeHouseholdId = resolveActiveHouseholdId(cookies);
		if (!activeHouseholdId) error(400, 'No active household');

		try {
			requireMembership(db, activeHouseholdId, locals.user!.id);
		} catch (e) {
			if (e instanceof MembershipError) error(403, 'Forbidden');
			throw e;
		}

		const discarded = setStatus(db, { id, householdId: activeHouseholdId, status: 'discarded' });
		if (!discarded) error(404, 'Item not found in your active household');

		const locationParam = url.searchParams.get('location');
		const target = locationParam ? `/?location=${encodeURIComponent(locationParam)}` : '/';
		redirect(303, target);
	}
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveActiveHouseholdId(cookies: import('@sveltejs/kit').Cookies): string | null {
	return cookies.get('gm_household') ?? null;
}
