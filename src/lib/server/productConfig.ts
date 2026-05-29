import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { OffConfig, ImageStore } from './off';

/**
 * Server-only glue for the Open Food Facts integration: reads env + touches the
 * disk so that `off.ts` can stay pure (and unit-testable without env/fs). This is
 * the only OFF-related module allowed to import `$env`/`$app`/`node:fs`.
 */

const DATABASE_PATH = env.DATABASE_PATH ?? './data/garde-manger.db';

// Re-attempt a `not_found` barcode at most once per week.
const NOT_FOUND_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// OFF serves product images from these hosts. We only ever download images whose
// URL host is an EXACT match here (see off.ts maybeDownloadImage — SSRF guard).
const IMAGE_HOST_ALLOWLIST = [
	'images.openfoodfacts.org',
	'static.openfoodfacts.org',
	'images.openfoodfacts.net',
	'static.openfoodfacts.net'
];

/**
 * Resolve the OFF client configuration from the environment.
 *
 * - dev: the OFF staging host (`.net`, basic-auth `off:off`) unless OFF_HOST is set.
 * - prod: the live host; OFF_USER_AGENT is REQUIRED (OFF rejects anonymous traffic).
 */
export function getOffConfig(): OffConfig {
	const userAgent = env.OFF_USER_AGENT ?? '';
	if (!dev && !userAgent) {
		throw new Error('OFF_USER_AGENT is required in production (Open Food Facts mandates it)');
	}

	const explicitHost = env.OFF_HOST?.replace(/\/+$/, '');
	const host =
		explicitHost ?? (dev ? 'https://world.openfoodfacts.net' : 'https://world.openfoodfacts.org');
	// The .net staging host is behind HTTP basic auth (off:off). Only attach it
	// when we're actually talking to a staging host and no explicit host overrides.
	const basicAuth = !explicitHost && dev ? 'off:off' : undefined;

	return {
		host,
		userAgent: userAgent || 'GardeManger/0.0.1 (dev)',
		notFoundTtlMs: NOT_FOUND_TTL_MS,
		basicAuth,
		imageHostAllowlist: IMAGE_HOST_ALLOWLIST
	};
}

/**
 * Directory where cached OFF product images live — beside the SQLite DB on the
 * persistent volume (design §13). Override with PRODUCT_IMAGE_DIR.
 */
export function productImageDir(): string {
	return env.PRODUCT_IMAGE_DIR ?? join(dirname(DATABASE_PATH), 'product-images');
}

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/jpg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif'
};

/**
 * Default {@link ImageStore}: writes `<barcode>.<ext>` into {@link productImageDir}
 * and returns the bare filename (stored in products.image_path). The serving route
 * MUST `basename()` the stored value before joining it back to the image dir.
 */
export const diskImageStore: ImageStore = {
	async save(barcode, bytes, contentType) {
		const dir = productImageDir();
		mkdirSync(dir, { recursive: true });
		const ext = EXT_BY_CONTENT_TYPE[contentType.split(';')[0].trim().toLowerCase()] ?? 'jpg';
		const filename = `${barcode}.${ext}`;
		writeFileSync(join(dir, filename), bytes);
		return filename;
	}
};
