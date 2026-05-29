import { describe, it, expect, beforeEach } from 'bun:test';
import { createDb, runMigrations } from './client';
import { products } from './schema';
import { eq } from 'drizzle-orm';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function makeDb() {
	const path = join(tmpdir(), `schema-products-test-${crypto.randomUUID()}.db`);
	const { db, sqlite } = createDb(path);
	runMigrations(db);
	return { db, sqlite };
}

describe('products schema (OFF cache)', () => {
	let db: ReturnType<typeof makeDb>['db'];

	beforeEach(() => {
		const result = makeDb();
		db = result.db;
	});

	it('round-trips a found product row including fetchedAt as a Date', () => {
		const fetchedAt = new Date('2026-05-29T10:00:00.000Z');

		db.insert(products)
			.values({
				barcode: '3017620422003',
				name: 'Nutella',
				brand: 'Ferrero',
				imagePath: 'products/3017620422003.jpg',
				quantity: '400 g',
				categories: 'en:spreads,en:hazelnut-spreads',
				status: 'found',
				fetchedAt
			})
			.run();

		const [row] = db.select().from(products).where(eq(products.barcode, '3017620422003')).all();
		expect(row.barcode).toBe('3017620422003');
		expect(row.name).toBe('Nutella');
		expect(row.brand).toBe('Ferrero');
		expect(row.imagePath).toBe('products/3017620422003.jpg');
		expect(row.quantity).toBe('400 g');
		expect(row.categories).toBe('en:spreads,en:hazelnut-spreads');
		expect(row.status).toBe('found');
		expect(row.fetchedAt).toBeInstanceOf(Date);
		expect(row.fetchedAt.getTime()).toBe(fetchedAt.getTime());
	});

	it('round-trips a not_found product row with null optional fields', () => {
		const fetchedAt = new Date('2026-05-29T11:30:00.000Z');

		db.insert(products)
			.values({
				barcode: '0000000000000',
				status: 'not_found',
				fetchedAt
			})
			.run();

		const [row] = db.select().from(products).where(eq(products.barcode, '0000000000000')).all();
		expect(row.barcode).toBe('0000000000000');
		expect(row.name).toBeNull();
		expect(row.brand).toBeNull();
		expect(row.imagePath).toBeNull();
		expect(row.quantity).toBeNull();
		expect(row.categories).toBeNull();
		expect(row.status).toBe('not_found');
		expect(row.fetchedAt.getTime()).toBe(fetchedAt.getTime());
	});

	it('rejects a duplicate barcode (primary key uniqueness)', () => {
		const fetchedAt = new Date('2026-05-29T12:00:00.000Z');

		db.insert(products).values({ barcode: '3017620422003', status: 'found', fetchedAt }).run();

		expect(() =>
			db.insert(products).values({ barcode: '3017620422003', status: 'not_found', fetchedAt }).run()
		).toThrow();
	});
});
