import { error, redirect, fail } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '$lib/server/db';
import { requireMembership, MembershipError, listForUser } from '$lib/server/households';
import { addPackaged } from '$lib/server/inventory';
import { lookupProduct, OffUnavailable } from '$lib/server/off';
import { getOffConfig, diskImageStore } from '$lib/server/productConfig';
import { offRateLimitGuard } from '$lib/server/offRateLimit';
import { normalizeBarcode } from '$lib/barcode';
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

export const load: PageServerLoad = async ({ params, parent, locals }) => {
	const norm = normalizeBarcode(params.barcode);
	if (norm === null) {
		error(400, 'Invalid barcode');
	}

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

	let product: typeof import('$lib/server/db/schema').products.$inferSelect | null = null;
	let offUnavailable = false;
	try {
		product = await lookupProduct(db, norm, getOffConfig(), {
			imageStore: diskImageStore,
			beforeOffCall: offRateLimitGuard
		});
	} catch (e) {
		if (e instanceof OffUnavailable) {
			offUnavailable = true;
		} else {
			throw e;
		}
	}

	return {
		noHousehold: false as const,
		locale,
		barcode: norm,
		// Keep the payload lean: only the fields the confirm page renders.
		product: product
			? {
					name: product.name,
					brand: product.brand,
					imagePath: product.imagePath,
					status: product.status
				}
			: null,
		offUnavailable
	};
};

// ── Validation schema ───────────────────────────────────────────────────────────

const locationSchema = v.picklist(['pantry', 'fridge', 'freezer'] as const);

const addPackagedSchema = v.object({
	barcode: v.pipe(v.string(), v.minLength(1)),
	name: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(200))),
	useByDate: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide')),
	quantity: v.optional(v.pipe(v.string(), v.regex(/^\d+$/, 'Quantité invalide'))),
	location: locationSchema
});

// ── Actions ───────────────────────────────────────────────────────────────────

export const actions: Actions = {
	add: async ({ request, locals, cookies }) => {
		const t = m(locals.locale);
		const userId = locals.user!.id;

		// Resolve active household the same way the layout does.
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
		const useByDateRaw = (data.get('useByDate') as string | null) ?? '';
		const nameRaw = ((data.get('name') as string | null) ?? '').trim();

		const raw: Record<string, unknown> = {
			barcode: (data.get('barcode') as string | null) ?? '',
			useByDate: useByDateRaw,
			location: (data.get('location') as string | null) ?? ''
		};
		if (nameRaw) raw.name = nameRaw;
		const quantityRaw = (data.get('quantity') as string | null) ?? '';
		if (quantityRaw) raw.quantity = quantityRaw;

		const parsed = v.safeParse(addPackagedSchema, raw);
		if (!parsed.success) {
			// DLC is the core requirement of the packaged flow → most helpful message.
			const message = !useByDateRaw ? t.scan_dlc_required : t.scan_error_generic;
			return fail(400, { message });
		}

		const { barcode, name, useByDate, quantity, location } = parsed.output;

		// Never trust the hidden barcode field — re-validate/normalize server-side.
		const normalized = normalizeBarcode(barcode);
		if (normalized === null) {
			return fail(400, { message: t.scan_error_generic });
		}

		addPackaged(db, {
			householdId: activeHouseholdId,
			addedBy: userId,
			barcode: normalized,
			productName: name ?? null,
			useByDate: new Date(useByDate + 'T12:00:00Z'),
			quantity: quantity ? parseInt(quantity, 10) : 1,
			location
		});

		redirect(303, '/');
	}
};
