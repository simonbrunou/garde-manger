import { describe, it, expect, beforeEach } from 'bun:test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createDb, runMigrations } from '../db/client.ts';
import { foods, shelfLives } from '../db/schema.ts';
import { seedFoods } from './seed.ts';

const VALID_LOCATIONS = new Set(['pantry', 'fridge', 'freezer']);
const VALID_BASES = new Set(['purchase', 'opened', 'unspecified']);
const VALID_UNITS = new Set(['hours', 'days', 'weeks', 'months', 'years']);

function makeDb() {
	const path = join(tmpdir(), `seed-test-${crypto.randomUUID()}.db`);
	const { db } = createDb(path);
	runMigrations(db);
	return { db };
}

describe('seedFoods', () => {
	let db: ReturnType<typeof makeDb>['db'];

	beforeEach(() => {
		const result = makeDb();
		db = result.db;
	});

	it('seeds more than 50 foods', () => {
		seedFoods(db);
		const allFoods = db.select().from(foods).all();
		expect(allFoods.length).toBeGreaterThan(50);
	});

	it('every food has non-empty FR and EN names', () => {
		seedFoods(db);
		const allFoods = db.select().from(foods).all();
		for (const food of allFoods) {
			expect(food.nameFr.trim().length).toBeGreaterThan(0);
			expect(food.nameEn.trim().length).toBeGreaterThan(0);
		}
	});

	it('every food has at least one shelf_life row', () => {
		seedFoods(db);
		const allFoods = db.select().from(foods).all();
		const allShelfLives = db.select().from(shelfLives).all();

		const byFood = new Map<string, number>();
		for (const sl of allShelfLives) {
			byFood.set(sl.foodId, (byFood.get(sl.foodId) ?? 0) + 1);
		}

		for (const food of allFoods) {
			const count = byFood.get(food.id) ?? 0;
			expect(count).toBeGreaterThanOrEqual(1);
		}
	});

	it('all shelf_life rows have valid enum values and min <= max', () => {
		seedFoods(db);
		const allShelfLives = db.select().from(shelfLives).all();
		expect(allShelfLives.length).toBeGreaterThan(0);

		for (const sl of allShelfLives) {
			expect(VALID_LOCATIONS.has(sl.location)).toBe(true);
			expect(VALID_BASES.has(sl.basis)).toBe(true);
			expect(VALID_UNITS.has(sl.unit)).toBe(true);
			expect(sl.min).toBeGreaterThanOrEqual(0);
			expect(sl.max).toBeGreaterThanOrEqual(sl.min);
		}
	});

	it('is idempotent: running twice yields the same counts', () => {
		seedFoods(db);
		const foodsAfterFirst = db.select().from(foods).all().length;
		const slAfterFirst = db.select().from(shelfLives).all().length;

		// Run again
		seedFoods(db);
		const foodsAfterSecond = db.select().from(foods).all().length;
		const slAfterSecond = db.select().from(shelfLives).all().length;

		expect(foodsAfterSecond).toBe(foodsAfterFirst);
		expect(slAfterSecond).toBe(slAfterFirst);
	});
});
