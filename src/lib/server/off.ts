import { eq } from 'drizzle-orm';
import type { DB } from './db/client';
import { products } from './db/schema';
import { isValidBarcode } from '$lib/barcode';

// ── Errors ──────────────────────────────────────────────────────────────────

/**
 * Thrown on a transient Open Food Facts failure (timeout / network error /
 * non-2xx response). The caller should treat this as "try again later" and the
 * cache MUST NOT be written for this barcode (never poison the cache).
 */
export class OffUnavailable extends Error {
	constructor(message = 'Open Food Facts is unavailable') {
		super(message);
		this.name = 'OffUnavailable';
	}
}

// ── Config & injectable deps ──────────────────────────────────────────────────

export interface OffConfig {
	host: string; // e.g. 'https://world.openfoodfacts.org'
	userAgent: string; // required by OFF
	notFoundTtlMs: number; // re-attempt a not_found only after this elapses
	basicAuth?: string; // 'off:off' for the .net staging host (Authorization: Basic ...)
	imageHostAllowlist: string[]; // ONLY download images whose URL host is in this list (SSRF guard)
}

export interface ImageStore {
	// returns the relative path stored in products.image_path; throws on failure
	save(barcode: string, bytes: Uint8Array, contentType: string): Promise<string>;
}

export interface LookupDeps {
	fetchImpl?: typeof fetch; // default: globalThis.fetch
	now?: Date; // default: new Date()
	imageStore?: ImageStore; // if omitted, images are NOT downloaded (imagePath stays null)
	timeoutMs?: number; // OFF request timeout, default 3500
	/**
	 * Called once right before a LIVE OFF product fetch (cache misses only — never
	 * on a cache hit). May THROW to abort the call (e.g. an outbound rate limiter
	 * protecting the shared server IP's OFF budget). Throw OffUnavailable to
	 * degrade gracefully to manual entry.
	 */
	beforeOffCall?: (now: Date) => void;
}

export interface ParsedOff {
	status: 'found' | 'not_found';
	name?: string;
	brand?: string;
	quantity?: string;
	categories?: string; // categories_tags joined with ','
	imageUrl?: string; // image_front_small_url preferred, else image_front_url
}

const DEFAULT_TIMEOUT_MS = 3500;
// Never buffer an unbounded image body into memory (product photos are small).
const MAX_IMAGE_BYTES = 2_000_000;
// Bound the product JSON too: a fields-scoped OFF response is a few KB; this is
// generous headroom while still refusing a hostile/oversized body.
const MAX_JSON_BYTES = 512_000;

// ── parseOffV2 (pure) ─────────────────────────────────────────────────────────

/** Coerce an unknown value to a trimmed non-empty string, else undefined. */
function trimmedOrUndefined(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Pure parser for an OFF v2 product response body.
 *
 * Body shape: `{ status: 0|1, product?: { product_name, brands, quantity,
 * categories_tags: string[], image_front_small_url, image_front_url } }`.
 *
 * Defensive: any unknown / null / non-object / malformed input yields
 * `{ status: 'not_found' }` and NEVER throws.
 */
export function parseOffV2(json: unknown): ParsedOff {
	if (typeof json !== 'object' || json === null) {
		return { status: 'not_found' };
	}

	const body = json as Record<string, unknown>;
	if (body.status !== 1) {
		return { status: 'not_found' };
	}

	const product =
		typeof body.product === 'object' && body.product !== null
			? (body.product as Record<string, unknown>)
			: {};

	let categories: string | undefined;
	if (Array.isArray(product.categories_tags)) {
		const tags = product.categories_tags
			.filter((t): t is string => typeof t === 'string')
			.map((t) => t.trim())
			.filter((t) => t.length > 0);
		categories = tags.length > 0 ? tags.join(',') : undefined;
	}

	const imageUrl =
		trimmedOrUndefined(product.image_front_small_url) ??
		trimmedOrUndefined(product.image_front_url);

	return {
		status: 'found',
		name: trimmedOrUndefined(product.product_name),
		brand: trimmedOrUndefined(product.brands),
		quantity: trimmedOrUndefined(product.quantity),
		categories,
		imageUrl
	};
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Download an allowlisted https image and persist it via the image store.
 * Returns the stored relative path, or null if the image was skipped (SSRF
 * guard) or any non-fatal failure occurred. NEVER throws.
 */
async function maybeDownloadImage(
	barcode: string,
	imageUrl: string,
	cfg: OffConfig,
	fetchImpl: typeof fetch,
	imageStore: ImageStore,
	timeoutMs: number
): Promise<string | null> {
	// SSRF guard: only https URLs whose host is explicitly allowlisted.
	let url: URL;
	try {
		url = new URL(imageUrl);
	} catch {
		return null;
	}
	if (url.protocol !== 'https:' || !cfg.imageHostAllowlist.includes(url.hostname)) {
		return null;
	}

	try {
		const res = await fetchImpl(url.toString(), {
			signal: AbortSignal.timeout(timeoutMs),
			// Do NOT follow redirects: an allowlisted OFF URL could 3xx to an
			// internal host (SSRF allowlist bypass). A 3xx response is not `ok`,
			// so it is skipped by the check below.
			redirect: 'manual'
		});
		if (!res.ok) return null;
		// Only accept genuine image responses: an allowlisted URL that returns
		// non-image content (or no content-type) is treated as "no image".
		const contentType = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
		if (!contentType.startsWith('image/')) return null;
		// Size guard: reject before buffering an oversized body into memory.
		const declared = Number(res.headers.get('content-length') ?? '0');
		if (declared > MAX_IMAGE_BYTES) return null;
		const bytes = new Uint8Array(await res.arrayBuffer());
		if (bytes.byteLength > MAX_IMAGE_BYTES) return null;
		return await imageStore.save(barcode, bytes, contentType);
	} catch {
		// Non-fatal: a missing/failed image must never fail the lookup.
		return null;
	}
}

// ── lookupProduct ─────────────────────────────────────────────────────────────

/**
 * Cache-first product lookup. Returns the products row (found or not_found).
 * Throws OffUnavailable on a transient failure (without poisoning the cache).
 *
 * This is the ONLY function permitted to call Open Food Facts.
 */
export async function lookupProduct(
	db: DB,
	barcode: string,
	cfg: OffConfig,
	deps: LookupDeps = {}
): Promise<typeof products.$inferSelect> {
	// 1. Defensive guard: the caller should have validated/normalized already.
	if (!isValidBarcode(barcode)) {
		throw new Error(`Invalid barcode: ${barcode}`);
	}

	const fetchImpl = deps.fetchImpl ?? globalThis.fetch;
	const now = deps.now ?? new Date();
	const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;

	// 2. Cache-first.
	const cached = db.select().from(products).where(eq(products.barcode, barcode)).get();
	if (cached) {
		if (cached.status === 'found') {
			return cached;
		}
		// not_found: serve from cache while still within TTL.
		if (now.getTime() - cached.fetchedAt.getTime() < cfg.notFoundTtlMs) {
			return cached;
		}
	}

	// Cache miss → we are about to hit OFF. Let the caller veto (outbound rate
	// limiting protects the single shared server IP from OFF's ~15/min/IP limit).
	deps.beforeOffCall?.(now);

	// 3. Fetch OFF.
	const fields =
		'product_name,brands,image_front_url,image_front_small_url,quantity,categories_tags';
	const productUrl = `${cfg.host}/api/v2/product/${barcode}.json?fields=${fields}`;

	const headers: Record<string, string> = { 'User-Agent': cfg.userAgent };
	if (cfg.basicAuth) {
		headers['Authorization'] = `Basic ${btoa(cfg.basicAuth)}`;
	}

	let res: Response;
	try {
		res = await fetchImpl(productUrl, {
			headers,
			signal: AbortSignal.timeout(timeoutMs)
		});
	} catch {
		// Network error / abort → transient. Do NOT touch the cache.
		throw new OffUnavailable();
	}
	if (!res.ok) {
		// Non-2xx → transient. Do NOT touch the cache.
		throw new OffUnavailable();
	}

	let json: unknown;
	try {
		const declared = Number(res.headers.get('content-length') ?? '0');
		if (declared > MAX_JSON_BYTES) throw new Error('oversized');
		const text = await res.text();
		if (text.length > MAX_JSON_BYTES) throw new Error('oversized');
		json = JSON.parse(text);
	} catch {
		throw new OffUnavailable();
	}

	// 4. Parse.
	const parsed = parseOffV2(json);

	// 5. Image (only for found results, only when a store is provided).
	let imagePath: string | null = null;
	if (parsed.status === 'found' && parsed.imageUrl && deps.imageStore) {
		imagePath = await maybeDownloadImage(
			barcode,
			parsed.imageUrl,
			cfg,
			fetchImpl,
			deps.imageStore,
			timeoutMs
		);
	}

	// 6. Upsert.
	const row =
		parsed.status === 'found'
			? {
					barcode,
					name: parsed.name ?? null,
					brand: parsed.brand ?? null,
					imagePath,
					quantity: parsed.quantity ?? null,
					categories: parsed.categories ?? null,
					status: 'found' as const,
					fetchedAt: now
				}
			: {
					barcode,
					name: null,
					brand: null,
					imagePath: null,
					quantity: null,
					categories: null,
					status: 'not_found' as const,
					fetchedAt: now
				};

	const upserted = db
		.insert(products)
		.values(row)
		.onConflictDoUpdate({
			target: products.barcode,
			set: {
				name: row.name,
				brand: row.brand,
				imagePath: row.imagePath,
				quantity: row.quantity,
				categories: row.categories,
				status: row.status,
				fetchedAt: row.fetchedAt
			}
		})
		.returning()
		.get();

	// 7. Return the upserted row (fall back to a re-select for safety).
	return upserted ?? db.select().from(products).where(eq(products.barcode, barcode)).get() ?? row;
}
