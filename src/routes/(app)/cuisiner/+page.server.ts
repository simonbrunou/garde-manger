import { error } from '@sveltejs/kit';
import { inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { foods } from '$lib/server/db/schema';
import { requireMembership, MembershipError } from '$lib/server/households';
import { listActive, bandFor } from '$lib/server/inventory';
import { ideasForCategory } from '$lib/server/cook';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { locale, households, activeHouseholdId } = await parent();
	if (!activeHouseholdId) return { noHousehold: true as const, locale };
	try {
		requireMembership(db, activeHouseholdId, locals.user!.id);
	} catch (e) {
		if (e instanceof MembershipError) error(403, 'Forbidden');
		throw e;
	}

	const warnDays = households.find((h) => h.id === activeHouseholdId)?.warnDays ?? 3;
	const items = listActive(db, activeHouseholdId);

	const foodIds = [...new Set(items.map((i) => i.foodId).filter((x): x is string => !!x))];
	const foodMap = new Map<string, typeof foods.$inferSelect>();
	if (foodIds.length > 0) {
		for (const f of db.select().from(foods).where(inArray(foods.id, foodIds)).all()) {
			foodMap.set(f.id, f);
		}
	}

	const now = new Date();
	const expiring: { id: string; name: string; band: 'urgent' | 'soon'; ideas: string[] }[] = [];
	for (const it of items) {
		const band = bandFor(it.effectiveDate ?? null, warnDays, now);
		if (band !== 'urgent' && band !== 'soon') continue;
		const food = it.foodId ? foodMap.get(it.foodId) : undefined;
		const category = food?.category ?? null;
		const ideas = ideasForCategory(category).map((i) => (locale === 'fr' ? i.fr : i.en));
		if (ideas.length === 0) continue; // only items we have ideas for
		const name = food ? (locale === 'fr' ? food.nameFr : food.nameEn) : (it.customName ?? '—');
		expiring.push({ id: it.id, name, band, ideas });
	}
	// urgent first, then soon
	expiring.sort((a, b) => (a.band === 'urgent' ? 0 : 1) - (b.band === 'urgent' ? 0 : 1));

	return { noHousehold: false as const, locale, items: expiring };
};
