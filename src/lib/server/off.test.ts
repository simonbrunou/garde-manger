import { describe, it, expect, beforeEach } from 'bun:test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { eq } from 'drizzle-orm';
import { createDb, runMigrations, type DB } from './db/client';
import { products } from './db/schema';
import { lookupProduct, parseOffV2, OffUnavailable, type OffConfig, type ImageStore } from './off';

// ── Test DB harness ─────────────────────────────────────────────────────────

function makeDb(): DB {
	const path = join(tmpdir(), `off-test-${crypto.randomUUID()}.db`);
	const { db } = createDb(path);
	runMigrations(db);
	return db;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BARCODE = '3017620422003'; // valid EAN-13 (Nutella)
const FIXED_NOW = new Date('2026-05-29T12:00:00.000Z');

const HOST = 'https://world.openfoodfacts.example';
const IMAGE_HOST = 'images.openfoodfacts.example';
const ALLOWED_IMAGE_URL = `https://${IMAGE_HOST}/front/3017620422003.jpg`;

const CFG: OffConfig = {
	host: HOST,
	userAgent: 'garde-manger-test/1.0',
	notFoundTtlMs: 60_000,
	imageHostAllowlist: [IMAGE_HOST]
};

// OFF v2 "found" body.
function foundBody(imageUrl?: string) {
	return {
		status: 1,
		product: {
			product_name: 'Nutella',
			brands: 'Ferrero',
			quantity: '400 g',
			categories_tags: ['en:spreads', 'en:hazelnut-spreads'],
			...(imageUrl ? { image_front_small_url: imageUrl } : {})
		}
	};
}

const NOT_FOUND_BODY = { status: 0 };

function jsonResponse(body: unknown, init?: ResponseInit): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'content-type': 'application/json' },
		...init
	});
}

// ── Fake fetch ────────────────────────────────────────────────────────────────

interface FakeFetchOptions {
	productBody?: unknown; // body returned for the OFF product endpoint
	productStatus?: number; // HTTP status for the product endpoint (default 200)
	productThrows?: boolean; // if true, the product fetch rejects (network error)
	imageBytes?: Uint8Array; // body returned for an image request
	imageStatus?: number; // HTTP status for image requests (default 200)
	imageThrows?: boolean; // if true, image fetch rejects
	imageContentType?: string;
}

interface FakeFetch {
	fetch: typeof fetch;
	productCalls: number;
	imageCalls: number;
}

function makeFakeFetch(opts: FakeFetchOptions = {}): FakeFetch {
	const state: FakeFetch = {
		productCalls: 0,
		imageCalls: 0,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		fetch: undefined as any
	};

	state.fetch = (async (input: RequestInfo | URL) => {
		const url = typeof input === 'string' ? input : input.toString();

		if (url.includes('/api/v2/product/')) {
			state.productCalls++;
			if (opts.productThrows) throw new Error('network down');
			const status = opts.productStatus ?? 200;
			if (status !== 200) {
				return new Response('error', { status });
			}
			return jsonResponse(opts.productBody ?? NOT_FOUND_BODY);
		}

		// Otherwise treat as an image request.
		state.imageCalls++;
		if (opts.imageThrows) throw new Error('image down');
		const status = opts.imageStatus ?? 200;
		if (status !== 200) {
			return new Response('error', { status });
		}
		const bytes = opts.imageBytes ?? new Uint8Array([1, 2, 3, 4]);
		return new Response(bytes.buffer as ArrayBuffer, {
			status: 200,
			headers: { 'content-type': opts.imageContentType ?? 'image/jpeg' }
		});
	}) as unknown as typeof fetch;

	return state;
}

// ── In-memory ImageStore ──────────────────────────────────────────────────────

interface RecordingImageStore extends ImageStore {
	calls: { barcode: string; bytes: Uint8Array; contentType: string }[];
}

function makeImageStore(opts: { throws?: boolean; path?: string } = {}): RecordingImageStore {
	const calls: RecordingImageStore['calls'] = [];
	return {
		calls,
		async save(barcode, bytes, contentType) {
			calls.push({ barcode, bytes, contentType });
			if (opts.throws) throw new Error('disk full');
			return opts.path ?? `products/${barcode}.jpg`;
		}
	};
}

function getRow(db: DB, barcode = BARCODE) {
	return db.select().from(products).where(eq(products.barcode, barcode)).get();
}

// ── lookupProduct ───────────────────────────────────────────────────────────

describe('lookupProduct — cache hit (found)', () => {
	let db: DB;
	beforeEach(() => {
		db = makeDb();
	});

	it('returns the cached found row without fetching', async () => {
		db.insert(products)
			.values({
				barcode: BARCODE,
				name: 'Nutella',
				brand: 'Ferrero',
				imagePath: 'products/3017620422003.jpg',
				quantity: '400 g',
				categories: 'en:spreads',
				status: 'found',
				fetchedAt: new Date('2026-05-01T00:00:00.000Z')
			})
			.run();

		const fake = makeFakeFetch({ productBody: foundBody() });
		const row = await lookupProduct(db, BARCODE, CFG, { fetchImpl: fake.fetch, now: FIXED_NOW });

		expect(row.status).toBe('found');
		expect(row.name).toBe('Nutella');
		expect(row.imagePath).toBe('products/3017620422003.jpg');
		expect(fake.productCalls).toBe(0);
		expect(fake.imageCalls).toBe(0);
	});
});

describe('lookupProduct — miss then fetch then cache', () => {
	let db: DB;
	beforeEach(() => {
		db = makeDb();
	});

	it('fetches exactly once on miss, caches, and serves cache on the second call', async () => {
		const fake = makeFakeFetch({ productBody: foundBody() });

		const first = await lookupProduct(db, BARCODE, CFG, { fetchImpl: fake.fetch, now: FIXED_NOW });
		expect(first.status).toBe('found');
		expect(first.name).toBe('Nutella');
		expect(first.brand).toBe('Ferrero');
		expect(first.quantity).toBe('400 g');
		expect(first.categories).toBe('en:spreads,en:hazelnut-spreads');
		expect(first.imagePath).toBeNull(); // no imageStore provided
		expect(first.fetchedAt.getTime()).toBe(FIXED_NOW.getTime());
		expect(fake.productCalls).toBe(1);

		// Row persisted as found.
		expect(getRow(db)?.status).toBe('found');

		// Second identical lookup → 0 extra fetches (1 scan ≤ 1 OFF call).
		const second = await lookupProduct(db, BARCODE, CFG, {
			fetchImpl: fake.fetch,
			now: new Date(FIXED_NOW.getTime() + 5_000)
		});
		expect(second.name).toBe('Nutella');
		expect(fake.productCalls).toBe(1); // still exactly one OFF call total
	});
});

describe('lookupProduct — not_found cached with TTL', () => {
	let db: DB;
	beforeEach(() => {
		db = makeDb();
	});

	it('caches not_found, serves within TTL (0 extra fetches), re-fetches past TTL', async () => {
		const fake = makeFakeFetch({ productBody: NOT_FOUND_BODY });

		const first = await lookupProduct(db, BARCODE, CFG, { fetchImpl: fake.fetch, now: FIXED_NOW });
		expect(first.status).toBe('not_found');
		expect(first.name).toBeNull();
		expect(fake.productCalls).toBe(1);

		// Within TTL → cache hit, no extra fetch.
		const within = await lookupProduct(db, BARCODE, CFG, {
			fetchImpl: fake.fetch,
			now: new Date(FIXED_NOW.getTime() + 1_000)
		});
		expect(within.status).toBe('not_found');
		expect(fake.productCalls).toBe(1);

		// Past TTL → re-fetch.
		const past = await lookupProduct(db, BARCODE, CFG, {
			fetchImpl: fake.fetch,
			now: new Date(FIXED_NOW.getTime() + CFG.notFoundTtlMs + 1)
		});
		expect(past.status).toBe('not_found');
		expect(fake.productCalls).toBe(2);
	});
});

describe('lookupProduct — transient failures (OffUnavailable, no cache poisoning)', () => {
	let db: DB;
	beforeEach(() => {
		db = makeDb();
	});

	it('throws OffUnavailable on network error and writes nothing', async () => {
		const fake = makeFakeFetch({ productThrows: true });

		await expect(
			lookupProduct(db, BARCODE, CFG, { fetchImpl: fake.fetch, now: FIXED_NOW })
		).rejects.toBeInstanceOf(OffUnavailable);

		expect(getRow(db)).toBeUndefined(); // cache not poisoned
	});

	it('throws OffUnavailable on a non-2xx response and writes nothing', async () => {
		const fake = makeFakeFetch({ productStatus: 503 });

		await expect(
			lookupProduct(db, BARCODE, CFG, { fetchImpl: fake.fetch, now: FIXED_NOW })
		).rejects.toBeInstanceOf(OffUnavailable);

		expect(getRow(db)).toBeUndefined(); // cache not poisoned
	});
});

describe('lookupProduct — image download success', () => {
	let db: DB;
	beforeEach(() => {
		db = makeDb();
	});

	it('downloads an allowlisted https image once and stores its path', async () => {
		const fake = makeFakeFetch({
			productBody: foundBody(ALLOWED_IMAGE_URL),
			imageBytes: new Uint8Array([9, 8, 7]),
			imageContentType: 'image/png'
		});
		const store = makeImageStore({ path: 'products/img.png' });

		const row = await lookupProduct(db, BARCODE, CFG, {
			fetchImpl: fake.fetch,
			now: FIXED_NOW,
			imageStore: store
		});

		expect(row.status).toBe('found');
		expect(row.imagePath).toBe('products/img.png');
		expect(fake.productCalls).toBe(1);
		expect(fake.imageCalls).toBe(1);
		expect(store.calls).toHaveLength(1);
		expect(store.calls[0].barcode).toBe(BARCODE);
		expect(store.calls[0].contentType).toBe('image/png');
		expect(Array.from(store.calls[0].bytes)).toEqual([9, 8, 7]);
	});
});

describe('lookupProduct — image SSRF guard', () => {
	let db: DB;
	beforeEach(() => {
		db = makeDb();
	});

	it('skips a non-allowlisted host and a non-https URL; row still saved as found', async () => {
		const store = makeImageStore();

		// Non-allowlisted host.
		const fake1 = makeFakeFetch({ productBody: foundBody('https://evil.example/x.jpg') });
		const row1 = await lookupProduct(db, BARCODE, CFG, {
			fetchImpl: fake1.fetch,
			now: FIXED_NOW,
			imageStore: store
		});
		expect(row1.status).toBe('found');
		expect(row1.imagePath).toBeNull();
		expect(fake1.imageCalls).toBe(0);
		expect(store.calls).toHaveLength(0);

		// Non-https URL on the otherwise-allowlisted host.
		const fake2 = makeFakeFetch({ productBody: foundBody(`http://${IMAGE_HOST}/x.jpg`) });
		const row2 = await lookupProduct(db, BARCODE, CFG, {
			fetchImpl: fake2.fetch,
			now: new Date(FIXED_NOW.getTime() + 1),
			imageStore: store
		});
		expect(row2.status).toBe('found');
		expect(row2.imagePath).toBeNull();
		expect(fake2.imageCalls).toBe(0);
		expect(store.calls).toHaveLength(0);
	});
});

describe('lookupProduct — image download non-fatal', () => {
	let db: DB;
	beforeEach(() => {
		db = makeDb();
	});

	it('returns a found row with null imagePath when the image fetch 500s', async () => {
		const fake = makeFakeFetch({
			productBody: foundBody(ALLOWED_IMAGE_URL),
			imageStatus: 500
		});
		const store = makeImageStore();

		const row = await lookupProduct(db, BARCODE, CFG, {
			fetchImpl: fake.fetch,
			now: FIXED_NOW,
			imageStore: store
		});

		expect(row.status).toBe('found');
		expect(row.imagePath).toBeNull();
		expect(store.calls).toHaveLength(0); // never reached save
	});

	it('returns a found row with null imagePath when imageStore.save throws', async () => {
		const fake = makeFakeFetch({
			productBody: foundBody(ALLOWED_IMAGE_URL),
			imageBytes: new Uint8Array([1])
		});
		const store = makeImageStore({ throws: true });

		const row = await lookupProduct(db, BARCODE, CFG, {
			fetchImpl: fake.fetch,
			now: FIXED_NOW,
			imageStore: store
		});

		expect(row.status).toBe('found');
		expect(row.imagePath).toBeNull();
		expect(store.calls).toHaveLength(1); // save was attempted
	});
});

describe('lookupProduct — defensive barcode guard', () => {
	it('throws a plain Error on an invalid barcode and never fetches', async () => {
		const db = makeDb();
		const fake = makeFakeFetch({ productBody: foundBody() });

		await expect(
			lookupProduct(db, '1234', CFG, { fetchImpl: fake.fetch, now: FIXED_NOW })
		).rejects.toThrow();
		expect(fake.productCalls).toBe(0);
	});
});

// ── parseOffV2 (pure) ─────────────────────────────────────────────────────────

describe('parseOffV2', () => {
	it('status 1 full → found with all fields mapped', () => {
		const parsed = parseOffV2(foundBody(ALLOWED_IMAGE_URL));
		expect(parsed.status).toBe('found');
		expect(parsed.name).toBe('Nutella');
		expect(parsed.brand).toBe('Ferrero');
		expect(parsed.quantity).toBe('400 g');
		expect(parsed.categories).toBe('en:spreads,en:hazelnut-spreads');
		expect(parsed.imageUrl).toBe(ALLOWED_IMAGE_URL);
	});

	it('prefers image_front_small_url over image_front_url', () => {
		const parsed = parseOffV2({
			status: 1,
			product: {
				product_name: 'X',
				image_front_small_url: 'https://a/small.jpg',
				image_front_url: 'https://a/big.jpg'
			}
		});
		expect(parsed.imageUrl).toBe('https://a/small.jpg');
	});

	it('falls back to image_front_url when small is absent', () => {
		const parsed = parseOffV2({
			status: 1,
			product: { product_name: 'X', image_front_url: 'https://a/big.jpg' }
		});
		expect(parsed.imageUrl).toBe('https://a/big.jpg');
	});

	it('status 1 partial → missing brand/image become undefined; empty strings drop', () => {
		const parsed = parseOffV2({
			status: 1,
			product: { product_name: '  Spaghetti  ', brands: '   ', quantity: '500 g' }
		});
		expect(parsed.status).toBe('found');
		expect(parsed.name).toBe('Spaghetti'); // trimmed
		expect(parsed.brand).toBeUndefined(); // whitespace-only → undefined
		expect(parsed.quantity).toBe('500 g');
		expect(parsed.categories).toBeUndefined();
		expect(parsed.imageUrl).toBeUndefined();
	});

	it('status 0 → not_found', () => {
		expect(parseOffV2({ status: 0 })).toEqual({ status: 'not_found' });
	});

	it('null / garbage / missing-status input → not_found, never throws', () => {
		expect(parseOffV2(null)).toEqual({ status: 'not_found' });
		expect(parseOffV2(undefined)).toEqual({ status: 'not_found' });
		expect(parseOffV2('nope')).toEqual({ status: 'not_found' });
		expect(parseOffV2(42)).toEqual({ status: 'not_found' });
		expect(parseOffV2([])).toEqual({ status: 'not_found' });
		expect(parseOffV2({})).toEqual({ status: 'not_found' });
		expect(parseOffV2({ status: 1 })).toEqual({ status: 'found' }); // product missing → no fields
	});
});
