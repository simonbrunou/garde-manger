import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { foods, products } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireMembership, MembershipError } from '$lib/server/households';
import { getItemScoped, updateItem, deleteItem, setStatus, bandFor } from '$lib/server/inventory';
import type { PageServerLoad, Actions } from './$types';

function activeHouseholdId(cookies: import('@sveltejs/kit').Cookies): string | null {
	return cookies.get('gm_household') ?? null;
}

export const load: PageServerLoad = async ({ params, locals, cookies, parent }) => {
	const { locale, households, activeHouseholdId: parentHouseholdId } = await parent();
	const hh = activeHouseholdId(cookies) ?? parentHouseholdId;
	if (!hh) redirect(303, '/garde-manger');
	try {
		requireMembership(db, hh, locals.user!.id);
	} catch (e) {
		if (e instanceof MembershipError) error(403, 'Forbidden');
		throw e;
	}
	const item = getItemScoped(db, { id: params.id, householdId: hh });
	if (!item) error(404, 'Not found');

	let name = '—';
	let category: string | null = null;
	let imagePath: string | null = null;
	if (item.foodId) {
		const food = db.select().from(foods).where(eq(foods.id, item.foodId)).get();
		if (food) {
			name = locale === 'fr' ? food.nameFr : food.nameEn;
			category = food.category;
		}
	} else if (item.kind === 'packaged' && item.barcode) {
		const product = db.select().from(products).where(eq(products.barcode, item.barcode)).get();
		name = product?.name ?? item.customName ?? item.barcode ?? '—';
		imagePath = product?.imagePath ?? null;
	} else if (item.customName) {
		name = item.customName;
	}

	const dateKind: 'DLC' | 'DDM' | null = item.useByDate ? 'DLC' : item.bestByDate ? 'DDM' : null;
	const effectiveDate = item.effectiveDate ? item.effectiveDate.toISOString() : null;
	const dateValue = effectiveDate ? effectiveDate.slice(0, 10) : '';
	// Use the household's real warnDays (same as home load) for an authoritative badge
	const activeHousehold = households.find((h) => h.id === hh);
	const warnDays = activeHousehold?.warnDays ?? 3;
	const band = bandFor(item.effectiveDate ?? null, warnDays, new Date());

	return {
		locale,
		item: {
			id: item.id,
			name,
			category,
			imagePath,
			barcode: item.barcode,
			location: item.location,
			quantity: item.quantity,
			notes: item.notes ?? '',
			dateKind,
			effectiveDate,
			dateValue,
			band,
			addedAt: item.addedAt ? item.addedAt.toISOString() : null
		}
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals, cookies }) => {
		const hh = activeHouseholdId(cookies);
		if (!hh) error(400, 'No active household');
		try {
			requireMembership(db, hh, locals.user!.id);
		} catch (e) {
			if (e instanceof MembershipError) error(403, 'Forbidden');
			throw e;
		}

		const fd = await request.formData();
		const location = fd.get('location') as 'pantry' | 'fridge' | 'freezer';
		const quantity = Math.max(1, parseInt((fd.get('quantity') as string) ?? '1', 10) || 1);
		const notes = ((fd.get('notes') as string) ?? '').trim() || null;
		const dateKind = fd.get('dateKind') as 'DLC' | 'DDM' | null;
		const dateStr = (fd.get('date') as string) ?? '';
		const date = dateStr ? new Date(dateStr) : null;

		const patch: Parameters<typeof updateItem>[1] = {
			id: params.id,
			householdId: hh,
			location,
			quantity,
			notes
		};
		if (dateKind === 'DLC') patch.useByDate = date;
		else if (dateKind === 'DDM') patch.bestByDate = date;

		const updated = updateItem(db, patch);
		if (!updated) return fail(404, { message: 'Not found' });
		redirect(303, `/item/${params.id}`);
	},

	consume: async ({ params, locals, cookies }) => {
		const hh = activeHouseholdId(cookies);
		if (!hh) error(400, 'No active household');
		try {
			requireMembership(db, hh, locals.user!.id);
		} catch (e) {
			if (e instanceof MembershipError) error(403, 'Forbidden');
			throw e;
		}
		if (!setStatus(db, { id: params.id, householdId: hh, status: 'consumed' })) {
			error(404, 'Not found');
		}
		redirect(303, '/garde-manger');
	},

	discard: async ({ params, locals, cookies }) => {
		const hh = activeHouseholdId(cookies);
		if (!hh) error(400, 'No active household');
		try {
			requireMembership(db, hh, locals.user!.id);
		} catch (e) {
			if (e instanceof MembershipError) error(403, 'Forbidden');
			throw e;
		}
		if (!setStatus(db, { id: params.id, householdId: hh, status: 'discarded' })) {
			error(404, 'Not found');
		}
		redirect(303, '/garde-manger');
	},

	remove: async ({ params, locals, cookies }) => {
		const hh = activeHouseholdId(cookies);
		if (!hh) error(400, 'No active household');
		try {
			requireMembership(db, hh, locals.user!.id);
		} catch (e) {
			if (e instanceof MembershipError) error(403, 'Forbidden');
			throw e;
		}
		if (!deleteItem(db, { id: params.id, householdId: hh })) {
			error(404, 'Not found');
		}
		redirect(303, '/garde-manger');
	}
};
