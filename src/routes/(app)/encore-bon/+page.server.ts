import { db } from '$lib/server/db';
import { foods } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { searchFoods, shelfLifeGuide } from '$lib/server/catalogue';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, parent }) => {
	const { locale } = await parent();
	const q = url.searchParams.get('q') ?? '';
	const foodId = url.searchParams.get('food');
	const results = searchFoods(db, q, locale);

	let selected: { id: string; name: string } | null = null;
	let guide: ReturnType<typeof shelfLifeGuide> = [];
	if (foodId) {
		const food = db.select().from(foods).where(eq(foods.id, foodId)).get();
		if (food) {
			selected = { id: food.id, name: locale === 'fr' ? food.nameFr : food.nameEn };
			guide = shelfLifeGuide(db, foodId, locale);
		}
	}
	return { locale, q, results, selected, guide };
};
