import { error } from '@sveltejs/kit';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { products } from '$lib/server/db/schema';
import { productImageDir } from '$lib/server/productConfig';
import { normalizeBarcode } from '$lib/barcode';
import type { RequestHandler } from './$types';

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.gif': 'image/gif'
};

export const GET: RequestHandler = ({ params, locals }) => {
	// +server.ts endpoints do NOT run the (app) layout's auth — check explicitly.
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const norm = normalizeBarcode(params.barcode);
	if (norm === null) {
		error(400, 'Invalid barcode');
	}

	const row = db.select().from(products).where(eq(products.barcode, norm)).get();
	if (!row || !row.imagePath) {
		error(404, 'Not found');
	}

	// Resolve the file path SAFELY. basename() strips any traversal; the
	// startsWith() assertion is belt-and-suspenders against path escapes.
	const dir = path.resolve(productImageDir());
	const file = path.resolve(dir, path.basename(row.imagePath));
	if (!file.startsWith(dir + path.sep)) {
		error(404, 'Not found');
	}

	let bytes: Buffer;
	try {
		bytes = readFileSync(file);
	} catch {
		error(404, 'Not found');
	}

	const ct = CONTENT_TYPE_BY_EXT[path.extname(file).toLowerCase()] ?? 'image/jpeg';

	return new Response(new Uint8Array(bytes), {
		headers: {
			'content-type': ct,
			'cache-control': 'public, max-age=31536000, immutable'
		}
	});
};
