import { describe, expect, test, mock } from 'bun:test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createDb, runMigrations, type DB } from '$lib/server/db/client';
import * as schema from '$lib/server/db/schema';
import { addCustom } from '$lib/server/inventory';
import { GENERIC_IDEA } from '$lib/server/cook';

const USER_ID = 'user-cook-1';
const HOUSEHOLD_ID = 'household-cook-1';

function makeDb(): DB {
	const db = createDb(join(tmpdir(), `cuisiner-test-${crypto.randomUUID()}.db`)).db;
	runMigrations(db);
	db.insert(schema.users)
		.values({ id: USER_ID, email: 'c@e.test', displayName: 'C', locale: 'fr', createdAt: new Date() })
		.run();
	db.insert(schema.households).values({ id: HOUSEHOLD_ID, name: 'Maison', createdAt: new Date() }).run();
	db.insert(schema.memberships)
		.values({ id: 'm1', householdId: HOUSEHOLD_ID, userId: USER_ID, role: 'admin', joinedAt: new Date() })
		.run();
	return db;
}

// Mock only the db singleton (kept export-complete so sibling test files that
// import schema from here still resolve). Real households/inventory/cook run.
const testDb = makeDb();
mock.module('$lib/server/db', () => ({ db: testDb, sqlite: null, ...schema }));

const { load } = await import('./+page.server');

function callLoad(locale: 'fr' | 'en' = 'fr') {
	return (
		load as unknown as (event: unknown) => Promise<{ items: { name: string; band: string; ideas: string[] }[] }>
	)({
		locals: { user: { id: USER_ID } },
		parent: async () => ({
			locale,
			households: [{ id: HOUSEHOLD_ID, warnDays: 3 }],
			activeHouseholdId: HOUSEHOLD_ID
		})
	});
}

describe('cuisiner load', () => {
	test('shows a custom-named expiring item with the generic fallback idea', async () => {
		addCustom(testDb, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			customName: 'Yaourt',
			location: 'fridge',
			useByDate: new Date(Date.now() - 86400000) // yesterday → urgent
		});

		const result = await callLoad('fr');

		const yaourt = result.items.find((i) => i.name === 'Yaourt');
		expect(yaourt).toBeDefined();
		expect(yaourt!.band).toBe('urgent');
		expect(yaourt!.ideas).toEqual([GENERIC_IDEA.fr]);
	});
});
