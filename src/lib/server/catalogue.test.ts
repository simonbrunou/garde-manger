import { describe, it, expect, beforeEach } from 'bun:test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createDb, runMigrations, type DB } from './db/client';
import { foods, shelfLives } from './db/schema';
import { searchFoods, computeBestBy, UNIT_MS, tipForItem } from './catalogue';
import { seedFoods } from './seed/seed';

function makeDb(): DB {
	const path = join(tmpdir(), `catalogue-test-${crypto.randomUUID()}.db`);
	const { db } = createDb(path);
	runMigrations(db);
	return db;
}

// ── searchFoods ────────────────────────────────────────────────────────────────

describe('searchFoods', () => {
	let db: DB;

	beforeEach(() => {
		db = makeDb();
		seedFoods(db);
	});

	it('finds a known food by French name', () => {
		const results = searchFoods(db, 'Pomme', 'fr');
		const names = results.map((r) => r.food.nameFr);
		expect(names).toContain('Pomme');
	});

	it('finds a known food by English name', () => {
		const results = searchFoods(db, 'Apple', 'en');
		const names = results.map((r) => r.food.nameEn);
		expect(names).toContain('Apple');
	});

	it('finds a food by French keyword (case-insensitive)', () => {
		// 'pommes' is a keyword for Pomme
		const results = searchFoods(db, 'pommes', 'fr');
		const names = results.map((r) => r.food.nameFr);
		expect(names).toContain('Pomme');
	});

	it('finds a food by English keyword (case-insensitive)', () => {
		// 'berries' appears in keywords for Fraises / Strawberries
		const results = searchFoods(db, 'berries', 'en');
		const namesFr = results.map((r) => r.food.nameFr);
		expect(namesFr.length).toBeGreaterThan(0);
		// At least strawberries should be there
		expect(namesFr).toContain('Fraises');
	});

	it('is case-insensitive (uppercase query)', () => {
		const results = searchFoods(db, 'POMME', 'fr');
		const names = results.map((r) => r.food.nameFr);
		expect(names).toContain('Pomme');
	});

	it('returns at most 20 results', () => {
		// Empty query should return up to 20 default foods
		const results = searchFoods(db, '', 'fr');
		expect(results.length).toBeGreaterThan(0);
		expect(results.length).toBeLessThanOrEqual(20);
	});

	it('empty query returns a default list ordered by name', () => {
		const results = searchFoods(db, '', 'fr');
		expect(results.length).toBeGreaterThan(0);
		// Verify sorted: each nameFr <= next using byte (SQLite default) ordering
		for (let i = 1; i < results.length; i++) {
			const a = results[i - 1].food.nameFr;
			const b = results[i].food.nameFr;
			expect(a <= b).toBe(true);
		}
	});

	it('attaches defaultShelfLife matching the food defaultLocation', () => {
		const results = searchFoods(db, 'Pomme', 'fr');
		const appleResult = results.find((r) => r.food.nameFr === 'Pomme');
		expect(appleResult).toBeDefined();
		// Apple defaultLocation = 'fridge'; should have a shelf life for fridge
		if (appleResult?.defaultShelfLife) {
			expect(appleResult.defaultShelfLife.location).toBe(appleResult.food.defaultLocation);
		}
	});

	it('returns empty array for a query that matches nothing', () => {
		const results = searchFoods(db, 'xyznonexistent999', 'fr');
		expect(results).toHaveLength(0);
	});
});

// ── Manual food insertion for isolated tests ───────────────────────────────────

describe('searchFoods (manual inserts)', () => {
	let db: DB;

	beforeEach(() => {
		db = makeDb();

		// Insert two minimal foods directly (no seed dependency)
		db.insert(foods)
			.values({
				id: 'food_test_lait',
				nameFr: 'Lait',
				nameEn: 'Milk',
				keywordsFr: 'laitier, produit laitier',
				keywordsEn: 'dairy, milk product',
				category: 'Produits laitiers',
				defaultLocation: 'fridge'
			})
			.run();

		db.insert(shelfLives)
			.values({
				id: 'sl_lait_fridge',
				foodId: 'food_test_lait',
				location: 'fridge',
				basis: 'opened',
				min: 3,
				max: 5,
				unit: 'days',
				notRecommended: false
			})
			.run();

		db.insert(foods)
			.values({
				id: 'food_test_fromage',
				nameFr: 'Fromage',
				nameEn: 'Cheese',
				keywordsFr: 'fromages, laitier',
				keywordsEn: 'cheeses, dairy',
				category: 'Produits laitiers',
				defaultLocation: 'fridge'
			})
			.run();
	});

	it('finds food by FR name (manual)', () => {
		const results = searchFoods(db, 'Lait', 'fr');
		expect(results.map((r) => r.food.id)).toContain('food_test_lait');
	});

	it('finds food by EN name (manual)', () => {
		const results = searchFoods(db, 'Cheese', 'en');
		expect(results.map((r) => r.food.id)).toContain('food_test_fromage');
	});

	it('finds food by FR keyword (manual)', () => {
		// 'laitier' appears in both foods' keywordsFr
		const results = searchFoods(db, 'laitier', 'fr');
		const ids = results.map((r) => r.food.id);
		expect(ids).toContain('food_test_lait');
		expect(ids).toContain('food_test_fromage');
	});

	it('attaches the correct shelf_life for defaultLocation', () => {
		const results = searchFoods(db, 'Lait', 'fr');
		const laitResult = results.find((r) => r.food.id === 'food_test_lait');
		expect(laitResult).toBeDefined();
		expect(laitResult!.defaultShelfLife).toBeDefined();
		expect(laitResult!.defaultShelfLife!.id).toBe('sl_lait_fridge');
	});

	it('defaultShelfLife is undefined when no shelf_life for defaultLocation', () => {
		// Fromage has no shelf_life row inserted
		const results = searchFoods(db, 'Fromage', 'fr');
		const fromageResult = results.find((r) => r.food.id === 'food_test_fromage');
		expect(fromageResult).toBeDefined();
		expect(fromageResult!.defaultShelfLife).toBeUndefined();
	});
});

// ── computeBestBy ──────────────────────────────────────────────────────────────

describe('computeBestBy', () => {
	const fixedDate = new Date('2024-01-01T00:00:00.000Z');

	it('midpoint of 3-5 days from fixedDate is exactly +4 days', () => {
		const result = computeBestBy(
			{ min: 3, max: 5, unit: 'days', notRecommended: false },
			fixedDate
		);
		expect(result).toEqual({
			date: new Date(fixedDate.getTime() + 4 * UNIT_MS.days),
			isEstimate: true
		});
	});

	it('midpoint of 1-3 weeks from fixedDate is exactly +2 weeks', () => {
		const result = computeBestBy(
			{ min: 1, max: 3, unit: 'weeks', notRecommended: false },
			fixedDate
		);
		expect(result).toEqual({
			date: new Date(fixedDate.getTime() + 2 * UNIT_MS.weeks),
			isEstimate: true
		});
	});

	it('midpoint of 6-12 months from fixedDate is exactly +9 months', () => {
		const result = computeBestBy(
			{ min: 6, max: 12, unit: 'months', notRecommended: false },
			fixedDate
		);
		expect(result).toEqual({
			date: new Date(fixedDate.getTime() + 9 * UNIT_MS.months),
			isEstimate: true
		});
	});

	it('converts hours correctly', () => {
		const result = computeBestBy(
			{ min: 2, max: 6, unit: 'hours', notRecommended: false },
			fixedDate
		);
		expect(result).toEqual({
			date: new Date(fixedDate.getTime() + 4 * UNIT_MS.hours),
			isEstimate: true
		});
	});

	it('converts years correctly', () => {
		const result = computeBestBy(
			{ min: 1, max: 3, unit: 'years', notRecommended: false },
			fixedDate
		);
		expect(result).toEqual({
			date: new Date(fixedDate.getTime() + 2 * UNIT_MS.years),
			isEstimate: true
		});
	});

	it('notRecommended returns { date: null, guidance: true }', () => {
		const result = computeBestBy(
			{ min: 1, max: 12, unit: 'months', notRecommended: true },
			fixedDate
		);
		expect(result).toEqual({ date: null, guidance: true });
	});

	it('notRecommended=false with min===max returns exact date', () => {
		const result = computeBestBy(
			{ min: 5, max: 5, unit: 'days', notRecommended: false },
			fixedDate
		);
		expect(result).toEqual({
			date: new Date(fixedDate.getTime() + 5 * UNIT_MS.days),
			isEstimate: true
		});
	});
});

// ── tipForItem ─────────────────────────────────────────────────────────────────

describe('tipForItem', () => {
	let db: DB;
	const FID = 'food-tip-test';
	beforeEach(() => {
		db = makeDb();
		db.insert(foods)
			.values({
				id: FID,
				nameFr: 'Test',
				nameEn: 'Test',
				category: 'Test',
				defaultLocation: 'fridge'
			})
			.run();
	});

	function addShelfLife(opts: {
		location: 'pantry' | 'fridge' | 'freezer';
		basis: 'purchase' | 'opened' | 'unspecified';
		tipsFr: string | null;
		tipsEn: string | null;
	}) {
		db.insert(shelfLives)
			.values({
				id: crypto.randomUUID(),
				foodId: FID,
				location: opts.location,
				basis: opts.basis,
				min: 1,
				max: 2,
				unit: 'days',
				tipsFr: opts.tipsFr,
				tipsEn: opts.tipsEn
			})
			.run();
	}

	it('returns the localized tip for the matching location', () => {
		addShelfLife({
			location: 'fridge',
			basis: 'purchase',
			tipsFr: 'Au frais',
			tipsEn: 'Keep cold'
		});
		expect(tipForItem(db, FID, 'fridge', 'en')).toBe('Keep cold');
		expect(tipForItem(db, FID, 'fridge', 'fr')).toBe('Au frais');
	});

	it('prefers the purchase-basis row over other bases', () => {
		addShelfLife({ location: 'fridge', basis: 'opened', tipsFr: 'O', tipsEn: 'Opened tip' });
		addShelfLife({ location: 'fridge', basis: 'purchase', tipsFr: 'A', tipsEn: 'Purchase tip' });
		expect(tipForItem(db, FID, 'fridge', 'en')).toBe('Purchase tip');
	});

	it('returns null when the location has no tip', () => {
		addShelfLife({ location: 'fridge', basis: 'purchase', tipsFr: null, tipsEn: null });
		expect(tipForItem(db, FID, 'fridge', 'en')).toBeNull();
		expect(tipForItem(db, FID, 'pantry', 'en')).toBeNull();
	});

	it('falls back to another basis when the purchase row has no tip', () => {
		addShelfLife({ location: 'fridge', basis: 'purchase', tipsFr: null, tipsEn: null });
		addShelfLife({ location: 'fridge', basis: 'opened', tipsFr: 'Entamé', tipsEn: 'Opened tip' });
		expect(tipForItem(db, FID, 'fridge', 'en')).toBe('Opened tip');
		expect(tipForItem(db, FID, 'fridge', 'fr')).toBe('Entamé');
	});
});
