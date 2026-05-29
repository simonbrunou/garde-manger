import type { DB } from '../db/client.ts';
import { foods, shelfLives } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { FOOD_SEED } from './foods.data.ts';

/**
 * Idempotent seed: upsert all foods and replace their shelf_lives.
 * Safe to run repeatedly — second run produces identical counts.
 */
export function seedFoods(db: DB): void {
	db.transaction((tx) => {
		for (const seed of FOOD_SEED) {
			const foodId = `food_${seed.key}`;

			// Upsert the food row (insert or replace all fields on conflict)
			tx.insert(foods)
				.values({
					id: foodId,
					nameFr: seed.nameFr,
					nameEn: seed.nameEn,
					subtitleFr: seed.subtitleFr ?? null,
					subtitleEn: seed.subtitleEn ?? null,
					keywordsFr: seed.keywordsFr ?? null,
					keywordsEn: seed.keywordsEn ?? null,
					category: seed.category,
					defaultLocation: seed.defaultLocation
				})
				.onConflictDoUpdate({
					target: foods.id,
					set: {
						nameFr: seed.nameFr,
						nameEn: seed.nameEn,
						subtitleFr: seed.subtitleFr ?? null,
						subtitleEn: seed.subtitleEn ?? null,
						keywordsFr: seed.keywordsFr ?? null,
						keywordsEn: seed.keywordsEn ?? null,
						category: seed.category,
						defaultLocation: seed.defaultLocation
					}
				})
				.run();

			// Delete then re-insert shelf_lives (deterministic ids)
			tx.delete(shelfLives).where(eq(shelfLives.foodId, foodId)).run();

			for (let i = 0; i < seed.shelfLives.length; i++) {
				const sl = seed.shelfLives[i];
				tx.insert(shelfLives)
					.values({
						id: `sl_${seed.key}_${i}`,
						foodId,
						location: sl.location,
						basis: sl.basis,
						min: sl.min,
						max: sl.max,
						unit: sl.unit,
						notRecommended: sl.notRecommended ?? false,
						tipsFr: sl.tipsFr ?? null,
						tipsEn: sl.tipsEn ?? null
					})
					.run();
			}
		}
	});
}

export async function main(): Promise<void> {
	// Import here (not top-level) so the CLI path doesn't drag in $env at import time
	const { createDb, runMigrations } = await import('../db/client.ts');
	const dbPath = process.env['DATABASE_PATH'] ?? './data/garde-manger.db';
	const { db } = createDb(dbPath);
	runMigrations(db);
	seedFoods(db);
	const count = db.select().from(foods).all().length;
	console.log(`✔ Seeded ${count} foods into ${dbPath}`);
}

if (import.meta.main) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
