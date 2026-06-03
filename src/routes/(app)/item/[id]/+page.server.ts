import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { foods, products } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
	requireMembership,
	MembershipError,
	listForUser,
	resolveActiveHouseholdId
} from '$lib/server/households';
import { getItemScoped, updateItem, deleteItem, recordUse, bandFor } from '$lib/server/inventory';
import { tipForItem, openedEstimate } from '$lib/server/catalogue';
import { m } from '$lib/i18n';
import type { PageServerLoad, Actions } from './$types';

// Resolve the active household for an action: validate the cookie against the user's
// memberships and fall back to their first household (mirrors the layout). A raw cookie
// read here would 403 a valid member whose cookie went stale. See households.ts.
function actionHousehold(cookies: import('@sveltejs/kit').Cookies, userId: string): string | null {
	const households = listForUser(db, userId);
	return resolveActiveHouseholdId(cookies.get('gm_household') ?? null, households);
}

export const load: PageServerLoad = async ({ params, locals, parent }) => {
	const { locale, households, activeHouseholdId: parentHouseholdId } = await parent();
	const hh = parentHouseholdId;
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

	const tip = item.foodId ? tipForItem(db, item.foodId, item.location, locale) : null;
	const canOpen =
		item.foodId !== null && openedEstimate(db, item.foodId, item.location, new Date()) !== null;

	const dateKind: 'DLC' | 'DDM' | null = item.useByDate ? 'DLC' : item.bestByDate ? 'DDM' : null;
	const effectiveDate = item.effectiveDate ? item.effectiveDate.toISOString() : null;
	const dateValue = effectiveDate ? effectiveDate.slice(0, 10) : '';
	// Use the household's real warnDays (same as home load) for an authoritative badge
	const activeHousehold = households.find((h) => h.id === hh);
	const warnDays = activeHousehold?.warnDays ?? 3;
	const band = bandFor(item.effectiveDate ?? null, warnDays, new Date());

	return {
		locale,
		tip,
		canOpen,
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
			addedAt: item.addedAt ? item.addedAt.toISOString() : null,
			isEstimate: item.isEstimate
		}
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals, cookies }) => {
		const hh = actionHousehold(cookies, locals.user!.id);
		if (!hh) error(400, 'No active household');
		try {
			requireMembership(db, hh, locals.user!.id);
		} catch (e) {
			if (e instanceof MembershipError) error(403, 'Forbidden');
			throw e;
		}

		const fd = await request.formData();
		const location = fd.get('location');
		if (location !== 'pantry' && location !== 'fridge' && location !== 'freezer') {
			return fail(400, { message: 'Invalid location' });
		}
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
		// Always set BOTH date fields from the chosen kind so the opposite one is
		// cleared — otherwise switching kind (or a crafted POST) would leave a stale
		// date that `effectiveDate = coalesce(use_by_date, best_by_date)` still reads.
		patch.useByDate = dateKind === 'DLC' ? date : null;
		patch.bestByDate = dateKind === 'DDM' ? date : null;

		const updated = updateItem(db, patch);
		if (!updated) return fail(404, { message: 'Not found' });
		redirect(303, `/item/${params.id}`);
	},

	consume: async ({ params, locals, cookies }) => {
		const hh = actionHousehold(cookies, locals.user!.id);
		if (!hh) error(400, 'No active household');
		try {
			requireMembership(db, hh, locals.user!.id);
		} catch (e) {
			if (e instanceof MembershipError) error(403, 'Forbidden');
			throw e;
		}
		const updated = recordUse(db, { id: params.id, householdId: hh, outcome: 'consumed' });
		if (!updated) error(404, 'Not found');
		// A multi-unit decrement leaves the row active — stay on the item page so the
		// user can keep drawing it down; a fully-closed row returns to the list.
		redirect(303, updated.status === 'active' ? `/item/${params.id}` : '/garde-manger');
	},

	discard: async ({ params, locals, cookies }) => {
		const hh = actionHousehold(cookies, locals.user!.id);
		if (!hh) error(400, 'No active household');
		try {
			requireMembership(db, hh, locals.user!.id);
		} catch (e) {
			if (e instanceof MembershipError) error(403, 'Forbidden');
			throw e;
		}
		const updated = recordUse(db, { id: params.id, householdId: hh, outcome: 'discarded' });
		if (!updated) error(404, 'Not found');
		// A multi-unit decrement leaves the row active — stay on the item page so the
		// user can keep drawing it down; a fully-closed row returns to the list.
		redirect(303, updated.status === 'active' ? `/item/${params.id}` : '/garde-manger');
	},

	open: async ({ params, locals, cookies }) => {
		const hh = actionHousehold(cookies, locals.user!.id);
		if (!hh) error(400, 'No active household');
		try {
			requireMembership(db, hh, locals.user!.id);
		} catch (e) {
			if (e instanceof MembershipError) error(403, 'Forbidden');
			throw e;
		}
		const t = m(locals.locale);
		const item = getItemScoped(db, { id: params.id, householdId: hh });
		if (!item || item.status !== 'active' || !item.foodId) error(404, 'Not found');
		const date = openedEstimate(db, item.foodId, item.location, new Date());
		if (!date) return fail(400, { message: t.item_open_no_data });
		updateItem(db, {
			id: params.id,
			householdId: hh,
			bestByDate: date,
			useByDate: null,
			isEstimate: true
		});
		redirect(303, `/item/${params.id}`);
	},

	remove: async ({ params, locals, cookies }) => {
		const hh = actionHousehold(cookies, locals.user!.id);
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
