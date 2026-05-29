import { describe, it, expect, beforeEach } from 'bun:test';
import { createDb, runMigrations, type DB } from './db/client';
import { users, households, memberships, inventoryItems } from './db/schema';
import { usersToNotify } from './reminders';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const MS_PER_DAY = 86_400_000;
const NOW = new Date('2026-05-29T09:00:00.000Z');
const TODAY_START = Date.UTC(2026, 4, 29); // 2026-05-29 UTC midnight

function makeDb(): DB {
	const path = join(tmpdir(), `reminders-test-${crypto.randomUUID()}.db`);
	const { db } = createDb(path);
	runMigrations(db);
	return db;
}

function addUser(db: DB, id: string) {
	db.insert(users)
		.values({ id, email: `${id}@ex.test`, displayName: id, createdAt: NOW })
		.run();
}
function addHousehold(db: DB, id: string, warnDays: number) {
	db.insert(households).values({ id, name: id, warnDays, createdAt: NOW }).run();
}
function addMember(db: DB, userId: string, householdId: string) {
	db.insert(memberships)
		.values({ id: `${userId}-${householdId}`, householdId, userId, role: 'member', joinedAt: NOW })
		.run();
}
let seq = 0;
function addItem(
	db: DB,
	householdId: string,
	opts: { useByOffsetDays?: number | null; status?: 'active' | 'consumed' }
) {
	const useBy =
		opts.useByOffsetDays === null || opts.useByOffsetDays === undefined
			? null
			: new Date(TODAY_START + opts.useByOffsetDays * MS_PER_DAY + 12 * 3600 * 1000); // midday
	db.insert(inventoryItems)
		.values({
			id: `item-${seq++}`,
			householdId,
			addedBy: 'owner',
			kind: 'fresh',
			location: 'fridge',
			quantity: 1,
			addedAt: NOW,
			useByDate: useBy,
			status: opts.status ?? 'active'
		})
		.run();
}

describe('usersToNotify', () => {
	let db: DB;
	beforeEach(() => {
		db = makeDb();
		seq = 0;
		addUser(db, 'owner'); // addedBy target
	});

	it('counts active expiring items across a user’s households, honouring each warn_days', () => {
		addUser(db, 'alice');
		addHousehold(db, 'h-fridge', 3); // warn 3 days
		addHousehold(db, 'h-pantry', 7); // warn 7 days
		addMember(db, 'alice', 'h-fridge');
		addMember(db, 'alice', 'h-pantry');

		// h-fridge (warn 3): in-window at +2 (counts), out-of-window at +5 (no)
		addItem(db, 'h-fridge', { useByOffsetDays: 2 });
		addItem(db, 'h-fridge', { useByOffsetDays: 5 });
		// h-pantry (warn 7): +5 counts (within 7), +9 does not
		addItem(db, 'h-pantry', { useByOffsetDays: 5 });
		addItem(db, 'h-pantry', { useByOffsetDays: 9 });

		const res = usersToNotify(db, NOW);
		const alice = res.find((r) => r.userId === 'alice');
		expect(alice?.count).toBe(2); // one from each household
	});

	it('includes past-due items and excludes consumed / no-date items', () => {
		addUser(db, 'bob');
		addHousehold(db, 'hb', 3);
		addMember(db, 'bob', 'hb');
		addItem(db, 'hb', { useByOffsetDays: -4 }); // past due → counts
		addItem(db, 'hb', { useByOffsetDays: 1 }); // soon → counts
		addItem(db, 'hb', { useByOffsetDays: 1, status: 'consumed' }); // consumed → excluded
		addItem(db, 'hb', { useByOffsetDays: null }); // no date → excluded

		const res = usersToNotify(db, NOW);
		expect(res.find((r) => r.userId === 'bob')?.count).toBe(2);
	});

	it('boundary: item exactly at todayStart + warn_days days counts; one day later does not', () => {
		addUser(db, 'carol');
		addHousehold(db, 'hc', 3);
		addMember(db, 'carol', 'hc');
		addItem(db, 'hc', { useByOffsetDays: 3 }); // == warn boundary → counts
		addItem(db, 'hc', { useByOffsetDays: 4 }); // just past → no

		expect(usersToNotify(db, NOW).find((r) => r.userId === 'carol')?.count).toBe(1);
	});

	it('omits users with nothing to notify', () => {
		addUser(db, 'dave');
		addHousehold(db, 'hd', 3);
		addMember(db, 'dave', 'hd');
		addItem(db, 'hd', { useByOffsetDays: 30 }); // far away

		expect(usersToNotify(db, NOW).find((r) => r.userId === 'dave')).toBeUndefined();
	});

	it('notifies every member of a shared household', () => {
		addUser(db, 'eve');
		addUser(db, 'frank');
		addHousehold(db, 'he', 3);
		addMember(db, 'eve', 'he');
		addMember(db, 'frank', 'he');
		addItem(db, 'he', { useByOffsetDays: 1 });

		const res = usersToNotify(db, NOW);
		expect(res.find((r) => r.userId === 'eve')?.count).toBe(1);
		expect(res.find((r) => r.userId === 'frank')?.count).toBe(1);
	});
});
