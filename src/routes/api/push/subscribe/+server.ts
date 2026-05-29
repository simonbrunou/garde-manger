import { json, error } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '$lib/server/db';
import { saveSubscription } from '$lib/server/push';
import type { RequestHandler } from './$types';

// A PushSubscription serialized via subscription.toJSON().
const subscribeSchema = v.object({
	endpoint: v.pipe(v.string(), v.url(), v.maxLength(2048)),
	keys: v.object({
		p256dh: v.pipe(v.string(), v.minLength(1), v.maxLength(256)),
		auth: v.pipe(v.string(), v.minLength(1), v.maxLength(256))
	}),
	deviceLabel: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(120)))
});

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		error(401, 'Authentification requise');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON');
	}

	const parsed = v.safeParse(subscribeSchema, body);
	if (!parsed.success) {
		error(400, 'Invalid subscription');
	}

	const { endpoint, keys, deviceLabel } = parsed.output;
	saveSubscription(db, locals.user.id, { endpoint, keys }, deviceLabel ?? null);

	return json({ ok: true });
};
