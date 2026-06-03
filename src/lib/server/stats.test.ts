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
		expect(other).toEqual({ eaten: 0, wasted: 0, prevEaten: 0, prevWasted: 0, streakDays: null });
	});

	it('items closed in the previous calendar month count in prevWasted/prevEaten', () => {
		// Previous month: April 2026
		addClosed(db, 'consumed', new Date('2026-04-10T10:00:00Z'));
		addClosed(db, 'consumed', new Date('2026-04-20T10:00:00Z'));
		addClosed(db, 'discarded', new Date('2026-04-15T10:00:00Z'));
		const s = householdStats(db, HH, NOW);
		expect(s.prevEaten).toBe(2);
		expect(s.prevWasted).toBe(1);
		// Must not bleed into current month
		expect(s.eaten).toBe(0);
		expect(s.wasted).toBe(0);
	});

	it('items closed in the current month do NOT count in prev', () => {
		addClosed(db, 'consumed', new Date('2026-05-05T10:00:00Z'));
		addClosed(db, 'discarded', new Date('2026-05-12T10:00:00Z'));
		const s = householdStats(db, HH, NOW);
		expect(s.eaten).toBe(1);
		expect(s.wasted).toBe(1);
		expect(s.prevEaten).toBe(0);
		expect(s.prevWasted).toBe(0);
	});

	it('boundary: item closed at exactly monthStart counts as current, not previous', () => {
		// 2026-05-01T00:00:00Z is the exact monthStart for NOW
		const monthStart = new Date('2026-05-01T00:00:00Z');
		addClosed(db, 'discarded', monthStart);
		const s = householdStats(db, HH, NOW);
		expect(s.wasted).toBe(1);
		expect(s.prevWasted).toBe(0);
	});
});
