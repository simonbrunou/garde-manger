import { describe, it, expect, beforeEach } from 'bun:test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createDb, runMigrations, type DB } from './db/client';
import { users, households, foods } from './db/schema';
import {
	addFresh,
	addCustom,
	addPackaged,
	listActive,
	getItem,
	setStatus,
	bandFor
} from './inventory';

// ── Test DB setup ─────────────────────────────────────────────────────────────

function makeDb(): DB {
	const path = join(tmpdir(), `inventory-test-${crypto.randomUUID()}.db`);
	const { db } = createDb(path);
	runMigrations(db);
	return db;
}

const USER_ID = 'user-test-inv-1';
const HOUSEHOLD_ID = 'household-test-inv-1';
const FOOD_ID = 'food-test-apple';

function seedFixtures(db: DB): void {
	db.insert(users)
		.values({
			id: USER_ID,
			email: 'inv-test@example.com',
			displayName: 'Inv Test User',
			locale: 'fr',
			createdAt: new Date()
		})
		.run();

	db.insert(households)
		.values({
			id: HOUSEHOLD_ID,
			name: 'Test Household',
			createdAt: new Date()
		})
		.run();

	db.insert(foods)
		.values({
			id: FOOD_ID,
			nameFr: 'Pomme',
			nameEn: 'Apple',
			category: 'Fruits',
			defaultLocation: 'fridge'
		})
		.run();
}

// ── addFresh ──────────────────────────────────────────────────────────────────

describe('addFresh', () => {
	let db: DB;

	beforeEach(() => {
		db = makeDb();
		seedFixtures(db);
	});

	it('inserts with kind=fresh, foodId set, customName=null', () => {
		const item = addFresh(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			foodId: FOOD_ID,
			location: 'fridge'
		});

		expect(item.kind).toBe('fresh');
		expect(item.foodId).toBe(FOOD_ID);
		expect(item.customName).toBeNull();
		expect(item.householdId).toBe(HOUSEHOLD_ID);
		expect(item.addedBy).toBe(USER_ID);
		expect(item.status).toBe('active');
		expect(item.location).toBe('fridge');
	});

	it('stores bestByDate and isEstimate', () => {
		const bestBy = new Date('2024-06-01T00:00:00.000Z');
		const item = addFresh(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			foodId: FOOD_ID,
			location: 'fridge',
			bestByDate: bestBy,
			isEstimate: true
		});

		expect(item.bestByDate?.getTime()).toBe(bestBy.getTime());
		expect(item.isEstimate).toBe(true);
	});

	it('defaults quantity to 1', () => {
		const item = addFresh(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			foodId: FOOD_ID,
			location: 'fridge'
		});
		expect(item.quantity).toBe(1);
	});

	it('returns the persisted row with an id', () => {
		const item = addFresh(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			foodId: FOOD_ID,
			location: 'fridge'
		});
		expect(item.id).toBeTruthy();
	});
});

// ── addCustom ─────────────────────────────────────────────────────────────────

describe('addCustom', () => {
	let db: DB;

	beforeEach(() => {
		db = makeDb();
		seedFixtures(db);
	});

	it('inserts with kind=fresh, customName set, foodId=null', () => {
		const item = addCustom(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			customName: 'Leftovers lasagna',
			location: 'fridge'
		});

		expect(item.kind).toBe('fresh');
		expect(item.customName).toBe('Leftovers lasagna');
		expect(item.foodId).toBeNull();
		expect(item.householdId).toBe(HOUSEHOLD_ID);
		expect(item.addedBy).toBe(USER_ID);
		expect(item.status).toBe('active');
	});

	it('stores useByDate when provided', () => {
		const useBy = new Date('2024-05-10T00:00:00.000Z');
		const item = addCustom(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			customName: 'Yogurt',
			location: 'fridge',
			useByDate: useBy
		});
		expect(item.useByDate?.getTime()).toBe(useBy.getTime());
	});

	it('stores bestByDate when provided', () => {
		const bestBy = new Date('2024-07-15T00:00:00.000Z');
		const item = addCustom(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			customName: 'Jam',
			location: 'pantry',
			bestByDate: bestBy
		});
		expect(item.bestByDate?.getTime()).toBe(bestBy.getTime());
	});

	it('defaults quantity to 1', () => {
		const item = addCustom(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			customName: 'Mystery sauce',
			location: 'fridge'
		});
		expect(item.quantity).toBe(1);
	});

	it('respects explicit quantity', () => {
		const item = addCustom(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			customName: 'Cans of beans',
			location: 'pantry',
			quantity: 6
		});
		expect(item.quantity).toBe(6);
	});
});

// ── addPackaged ─────────────────────────────────────────────────────────────────

describe('addPackaged', () => {
	let db: DB;

	const BARCODE = '3017620422003';

	beforeEach(() => {
		db = makeDb();
		seedFixtures(db);
	});

	it('inserts with kind=packaged, barcode set, foodId null, useByDate set, isEstimate false', () => {
		const useBy = new Date('2024-08-01T00:00:00.000Z');
		const item = addPackaged(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			barcode: BARCODE,
			useByDate: useBy,
			location: 'pantry'
		});

		expect(item.kind).toBe('packaged');
		expect(item.barcode).toBe(BARCODE);
		expect(item.foodId).toBeNull();
		expect(item.useByDate?.getTime()).toBe(useBy.getTime());
		expect(item.bestByDate).toBeNull();
		expect(item.isEstimate).toBe(false);
		expect(item.status).toBe('active');
		expect(item.location).toBe('pantry');
	});

	it('appears in listActive with effectiveDate equal to useByDate', () => {
		const useBy = new Date('2024-08-01T00:00:00.000Z');
		const item = addPackaged(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			barcode: BARCODE,
			useByDate: useBy,
			location: 'pantry'
		});

		const active = listActive(db, HOUSEHOLD_ID);
		const found = active.find((i) => i.id === item.id);
		expect(found).toBeDefined();
		// effectiveDate = coalesce(useByDate, bestByDate) = useByDate
		expect(found!.effectiveDate?.getTime()).toBe(useBy.getTime());
	});

	it('can be consumed via setStatus (household-scoped) and drops out of listActive', () => {
		const item = addPackaged(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			barcode: BARCODE,
			useByDate: new Date('2024-08-01T00:00:00.000Z'),
			location: 'pantry'
		});

		expect(listActive(db, HOUSEHOLD_ID).some((i) => i.id === item.id)).toBe(true);

		const consumed = setStatus(db, { id: item.id, householdId: HOUSEHOLD_ID, status: 'consumed' });
		expect(consumed).toBeDefined();
		expect(consumed!.status).toBe('consumed');

		expect(listActive(db, HOUSEHOLD_ID).some((i) => i.id === item.id)).toBe(false);
	});

	it('stores productName in customName', () => {
		const item = addPackaged(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			barcode: BARCODE,
			productName: 'Pâte à tartiner',
			useByDate: new Date('2024-08-01T00:00:00.000Z'),
			location: 'pantry'
		});
		expect(item.customName).toBe('Pâte à tartiner');
	});

	it('inserts without useByDate (effectiveDate null)', () => {
		const item = addPackaged(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			barcode: BARCODE,
			location: 'pantry'
		});

		expect(item.useByDate).toBeNull();
		expect(item.effectiveDate).toBeNull();

		const found = listActive(db, HOUSEHOLD_ID).find((i) => i.id === item.id);
		expect(found).toBeDefined();
		expect(found!.effectiveDate).toBeNull();
	});
});

// ── listActive ────────────────────────────────────────────────────────────────

describe('listActive', () => {
	let db: DB;

	beforeEach(() => {
		db = makeDb();
		seedFixtures(db);
	});

	it('returns only active items for the household', () => {
		addFresh(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			foodId: FOOD_ID,
			location: 'fridge'
		});
		addFresh(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			foodId: FOOD_ID,
			location: 'fridge'
		});

		const active = listActive(db, HOUSEHOLD_ID);
		expect(active.length).toBe(2);
		for (const item of active) {
			expect(item.status).toBe('active');
		}
	});

	it('excludes items with status consumed or discarded', () => {
		const item1 = addFresh(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			foodId: FOOD_ID,
			location: 'fridge'
		});
		const item2 = addFresh(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			foodId: FOOD_ID,
			location: 'fridge'
		});
		addFresh(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			foodId: FOOD_ID,
			location: 'fridge'
		});

		setStatus(db, { id: item1.id, householdId: HOUSEHOLD_ID, status: 'consumed' });
		setStatus(db, { id: item2.id, householdId: HOUSEHOLD_ID, status: 'discarded' });

		const active = listActive(db, HOUSEHOLD_ID);
		expect(active.length).toBe(1);
	});

	it('orders items by effectiveDate ASC, NULLs last', () => {
		// Insert items with dates out of order, plus one with no date
		const later = new Date('2024-06-10T00:00:00.000Z');
		const earlier = new Date('2024-05-01T00:00:00.000Z');

		addCustom(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			customName: 'No date item',
			location: 'fridge'
			// no useByDate or bestByDate → effectiveDate = NULL
		});

		addCustom(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			customName: 'Later item',
			location: 'fridge',
			bestByDate: later
		});

		addCustom(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			customName: 'Earlier item',
			location: 'fridge',
			bestByDate: earlier
		});

		const active = listActive(db, HOUSEHOLD_ID);
		expect(active.length).toBe(3);

		// First item should have the earliest date
		expect(active[0].effectiveDate?.getTime()).toBe(earlier.getTime());
		// Second item should have the later date
		expect(active[1].effectiveDate?.getTime()).toBe(later.getTime());
		// Third item should have NULL effectiveDate (the no-date item)
		expect(active[2].effectiveDate).toBeNull();
	});

	it('filters by location when provided', () => {
		addCustom(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			customName: 'Fridge item',
			location: 'fridge'
		});
		addCustom(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			customName: 'Pantry item',
			location: 'pantry'
		});
		addCustom(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			customName: 'Another fridge item',
			location: 'fridge'
		});

		const fridgeItems = listActive(db, HOUSEHOLD_ID, { location: 'fridge' });
		expect(fridgeItems.length).toBe(2);
		for (const item of fridgeItems) {
			expect(item.location).toBe('fridge');
		}

		const pantryItems = listActive(db, HOUSEHOLD_ID, { location: 'pantry' });
		expect(pantryItems.length).toBe(1);
		expect(pantryItems[0].customName).toBe('Pantry item');
	});

	it('returns empty array when household has no active items', () => {
		const active = listActive(db, HOUSEHOLD_ID);
		expect(active).toHaveLength(0);
	});
});

// ── getItem ───────────────────────────────────────────────────────────────────

describe('getItem', () => {
	let db: DB;

	beforeEach(() => {
		db = makeDb();
		seedFixtures(db);
	});

	it('returns the item for a known id', () => {
		const inserted = addFresh(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			foodId: FOOD_ID,
			location: 'fridge'
		});
		const found = getItem(db, inserted.id);
		expect(found).toBeDefined();
		expect(found!.id).toBe(inserted.id);
	});

	it('returns undefined for an unknown id', () => {
		const found = getItem(db, 'nonexistent-id-xyz');
		expect(found).toBeUndefined();
	});
});

// ── setStatus ─────────────────────────────────────────────────────────────────

describe('setStatus', () => {
	let db: DB;

	beforeEach(() => {
		db = makeDb();
		seedFixtures(db);
	});

	it('moves item to consumed and sets closedAt', () => {
		const item = addFresh(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			foodId: FOOD_ID,
			location: 'fridge'
		});

		expect(item.status).toBe('active');
		expect(item.closedAt).toBeNull();

		const updated = setStatus(db, { id: item.id, householdId: HOUSEHOLD_ID, status: 'consumed' });

		expect(updated).toBeDefined();
		expect(updated!.status).toBe('consumed');
		expect(updated!.closedAt).not.toBeNull();
		expect(updated!.closedAt).toBeInstanceOf(Date);
	});

	it('moves item to discarded and sets closedAt', () => {
		const item = addCustom(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			customName: 'Old food',
			location: 'fridge'
		});

		const updated = setStatus(db, { id: item.id, householdId: HOUSEHOLD_ID, status: 'discarded' });

		expect(updated).toBeDefined();
		expect(updated!.status).toBe('discarded');
		expect(updated!.closedAt).not.toBeNull();
	});

	it('item is no longer returned by listActive after setStatus', () => {
		const item = addFresh(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			foodId: FOOD_ID,
			location: 'fridge'
		});

		const beforeUpdate = listActive(db, HOUSEHOLD_ID);
		expect(beforeUpdate.some((i) => i.id === item.id)).toBe(true);

		setStatus(db, { id: item.id, householdId: HOUSEHOLD_ID, status: 'consumed' });

		const afterUpdate = listActive(db, HOUSEHOLD_ID);
		expect(afterUpdate.some((i) => i.id === item.id)).toBe(false);
	});

	it('cross-household: cannot discard an item belonging to another household', () => {
		// Seed a second user and household
		const USER_B_ID = 'user-test-inv-b';
		const HOUSEHOLD_B_ID = 'household-test-inv-b';

		db.insert(users)
			.values({
				id: USER_B_ID,
				email: 'inv-test-b@example.com',
				displayName: 'Inv Test User B',
				locale: 'fr',
				createdAt: new Date()
			})
			.run();

		db.insert(households)
			.values({
				id: HOUSEHOLD_B_ID,
				name: 'Household B',
				createdAt: new Date()
			})
			.run();

		// Add an item to household B
		const itemB = addCustom(db, {
			householdId: HOUSEHOLD_B_ID,
			addedBy: USER_B_ID,
			customName: 'Household B item',
			location: 'pantry'
		});

		// Attempting to discard itemB using household A's id must return undefined (no-op)
		const result = setStatus(db, { id: itemB.id, householdId: HOUSEHOLD_ID, status: 'discarded' });
		expect(result).toBeUndefined();

		// itemB must still be active in household B
		const stillActive = listActive(db, HOUSEHOLD_B_ID);
		expect(stillActive.some((i) => i.id === itemB.id)).toBe(true);
		const unchanged = stillActive.find((i) => i.id === itemB.id)!;
		expect(unchanged.status).toBe('active');

		// household A's list must NOT include itemB
		const householdAItems = listActive(db, HOUSEHOLD_ID);
		expect(householdAItems.some((i) => i.id === itemB.id)).toBe(false);

		// Now discard with the correct household — must succeed
		const discarded = setStatus(db, {
			id: itemB.id,
			householdId: HOUSEHOLD_B_ID,
			status: 'discarded'
		});
		expect(discarded).toBeDefined();
		expect(discarded!.status).toBe('discarded');
	});
});

// ── bandFor ───────────────────────────────────────────────────────────────────

describe('bandFor', () => {
	const now = new Date('2024-06-15T12:00:00.000Z'); // reference "now"
	const warnDays = 3;

	it('null effectiveDate → ok', () => {
		expect(bandFor(null, warnDays, now)).toBe('ok');
	});

	it('past date → urgent', () => {
		const past = new Date('2024-06-10T00:00:00.000Z');
		expect(bandFor(past, warnDays, now)).toBe('urgent');
	});

	it('today (same day) → urgent', () => {
		// Same calendar day as now
		const today = new Date('2024-06-15T00:00:00.000Z');
		expect(bandFor(today, warnDays, now)).toBe('urgent');
	});

	it('within warnDays → soon', () => {
		// now is June 15; warnDays=3 → warn boundary = June 18; June 17 is within
		const soonDate = new Date('2024-06-17T00:00:00.000Z');
		expect(bandFor(soonDate, warnDays, now)).toBe('soon');
	});

	it('exactly at warnDays boundary → soon', () => {
		// June 18 = now + 3 days (boundary is inclusive)
		const boundaryDate = new Date('2024-06-18T00:00:00.000Z');
		expect(bandFor(boundaryDate, warnDays, now)).toBe('soon');
	});

	it('beyond warnDays → ok', () => {
		const future = new Date('2024-06-20T00:00:00.000Z');
		expect(bandFor(future, warnDays, now)).toBe('ok');
	});

	it('tomorrow (1 day away) with warnDays=0 → ok', () => {
		const tomorrow = new Date('2024-06-16T00:00:00.000Z');
		expect(bandFor(tomorrow, 0, now)).toBe('ok');
	});

	it('warnDays=0 and today → urgent', () => {
		const today = new Date('2024-06-15T00:00:00.000Z');
		expect(bandFor(today, 0, now)).toBe('urgent');
	});
});
