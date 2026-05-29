import { env } from '$env/dynamic/private';
import { createDb, runMigrations } from './client';
import { foods } from './schema';
import { seedFoods } from '$lib/server/seed/seed';

const DATABASE_PATH = env.DATABASE_PATH ?? './data/garde-manger.db';

export const { db, sqlite } = createDb(DATABASE_PATH);
runMigrations(db);

// Auto-seed the food catalogue on first boot (idempotent — only runs when table is empty).
const hasFood = db.select({ id: foods.id }).from(foods).limit(1).all().length > 0;
if (!hasFood) {
	seedFoods(db);
}

export * from './schema';
