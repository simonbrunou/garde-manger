import { describe, it, expect, beforeEach } from 'bun:test';
import { createDb, runMigrations } from './client';
import { users, households, foods, shelfLives, inventoryItems } from './schema';
import { eq } from 'drizzle-orm';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function makeDb() {
	const path = join(tmpdir(), `schema-inventory-test-${crypto.randomUUID()}.db`);
	const { db, sqlite } = createDb(path);
	runMigrations(db);
	return { db, sqlite };
}

describe('inventory schema', () => {
	let db: ReturnType<typeof makeDb>['db'];
	let sqlite: ReturnType<typeof makeDb>['sqlite'];

	beforeEach(() => {
		const result = makeDb();
		db = result.db;
		sqlite = result.sqlite;
	});

	it('inserts food + shelf_life with FK cascade', () => {
		const foodId = crypto.randomUUID();

		db.insert(foods)
			.values({
				id: foodId,
				nameFr: 'Lait',
				nameEn: 'Milk',
				category: 'dairy',
				defaultLocation: 'fridge'
			})
			.run();

		const shelfId = crypto.randomUUID();
		db.insert(shelfLives)
			.values({
				id: shelfId,
				foodId,
				location: 'fridge',
				basis: 'opened',
				min: 3,
				max: 7,
				unit: 'days'
			})
			.run();

		const [shelf] = db.select().from(shelfLives).where(eq(shelfLives.id, shelfId)).all();
		expect(shelf.foodId).toBe(foodId);
		expect(shelf.unit).toBe('days');
	});

	it('effectiveDate = bestByDate when only bestByDate is set', () => {
		const now = new Date();
		const userId = crypto.randomUUID();
		const householdId = crypto.randomUUID();
		const bestBy = new Date(now.getTime() + 7 * 86400_000);

		db.insert(users)
			.values({
				id: userId,
				email: `user-${userId}@example.com`,
				displayName: 'Test User',
				locale: 'fr',
				createdAt: now
			})
			.run();

		db.insert(households)
			.values({
				id: householdId,
				name: 'Test Household',
				createdAt: now
			})
			.run();

		const itemId = crypto.randomUUID();
		db.insert(inventoryItems)
			.values({
				id: itemId,
				householdId,
				addedBy: userId,
				kind: 'fresh',
				quantity: 1,
				location: 'fridge',
				addedAt: now,
				bestByDate: bestBy
				// useByDate intentionally omitted → effectiveDate should equal bestByDate
			})
			.run();

		const [item] = db.select().from(inventoryItems).where(eq(inventoryItems.id, itemId)).all();
		expect(item.bestByDate).not.toBeNull();
		expect(item.useByDate).toBeNull();
		// effectiveDate must equal bestByDate (coalesce picks bestByDate when useByDate is null)
		expect(item.effectiveDate?.getTime()).toBe(item.bestByDate!.getTime());
	});

	it('effectiveDate = useByDate when useByDate is set', () => {
		const now = new Date();
		const userId = crypto.randomUUID();
		const householdId = crypto.randomUUID();
		const useBy = new Date(now.getTime() + 3 * 86400_000);
		const bestBy = new Date(now.getTime() + 7 * 86400_000);

		db.insert(users)
			.values({
				id: userId,
				email: `user-${userId}@example.com`,
				displayName: 'Test User 2',
				locale: 'en',
				createdAt: now
			})
			.run();

		db.insert(households)
			.values({
				id: householdId,
				name: 'Test Household 2',
				createdAt: now
			})
			.run();

		const itemId = crypto.randomUUID();
		db.insert(inventoryItems)
			.values({
				id: itemId,
				householdId,
				addedBy: userId,
				kind: 'packaged',
				quantity: 2,
				location: 'pantry',
				addedAt: now,
				useByDate: useBy,
				bestByDate: bestBy
			})
			.run();

		const [item] = db.select().from(inventoryItems).where(eq(inventoryItems.id, itemId)).all();
		expect(item.useByDate).not.toBeNull();
		// effectiveDate must equal useByDate (coalesce picks useByDate first)
		expect(item.effectiveDate?.getTime()).toBe(item.useByDate!.getTime());
	});

	it('index inv_household_status_eff exists in sqlite_master', () => {
		const row = sqlite
			.query<
				{ name: string },
				[]
			>("SELECT name FROM sqlite_master WHERE type='index' AND name='inv_household_status_eff'")
			.get();
		expect(row).not.toBeNull();
		expect(row?.name).toBe('inv_household_status_eff');
	});
});
