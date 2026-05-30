import { describe, it, expect, beforeEach } from 'bun:test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createDb, runMigrations, type DB } from './db/client';
import { users, households, inventoryItems } from './db/schema';
import { householdStats } from './stats';

const HH = 'hh-stats-1';
const HH2 = 'hh-stats-2';
const U = 'u-stats-1';
const NOW = new Date('2026-05-15T12:00:00Z');

function makeDb(): DB {
	const { db } = createDb(join(tmpdir(), `stats-test-${crypto.randomUUID()}.db`));
	runMigrations(db);
	db.insert(users)
		.values({ id: U, email: 's@e.com', displayName: 'S', locale: 'fr', createdAt: new Date() })
		.run();
	db.insert(households).values({ id: HH, name: 'H1', createdAt: new Date() }).run();
	db.insert(households).values({ id: HH2, name: 'H2', createdAt: new Date() }).run();
	return db;
}

function addClosed(
	db: DB,
	status: 'consumed' | 'discarded',
	closedAt: Date,
	householdId = HH
): void {
	db.insert(inventoryItems)
		.values({
			id: crypto.randomUUID(),
			householdId,
			addedBy: U,
			kind: 'fresh',
			location: 'fridge',
			addedAt: new Date('2026-01-01T00:00:00Z'),
			status,
			closedAt
		})
		.run();
}

describe('householdStats', () => {
	let db: DB;
	beforeEach(() => {
		db = makeDb();
	});

	it('counts consumed vs discarded in the current month only', () => {
		addClosed(db, 'consumed', new Date('2026-05-03T10:00:00Z'));
		addClosed(db, 'consumed', new Date('2026-05-10T10:00:00Z'));
		addClosed(db, 'discarded', new Date('2026-05-12T10:00:00Z'));
		addClosed(db, 'consumed', new Date('2026-04-28T10:00:00Z')); // last month → excluded
		const s = householdStats(db, HH, NOW);
		expect(s.eaten).toBe(2);
		expect(s.wasted).toBe(1);
	});

	it('streakDays = whole days since the last discard', () => {
		addClosed(db, 'discarded', new Date('2026-05-10T10:00:00Z'));
		expect(householdStats(db, HH, NOW).streakDays).toBe(5);
	});

	it('streakDays is null when nothing was ever discarded', () => {
		addClosed(db, 'consumed', new Date('2026-05-10T10:00:00Z'));
		expect(householdStats(db, HH, NOW).streakDays).toBeNull();
	});

	it('is household-scoped', () => {
		addClosed(db, 'consumed', new Date('2026-05-10T10:00:00Z'), HH);
		addClosed(db, 'discarded', new Date('2026-05-11T10:00:00Z'), HH);
		const other = householdStats(db, HH2, NOW);
		expect(other).toEqual({ eaten: 0, wasted: 0, streakDays: null });
	});
});
