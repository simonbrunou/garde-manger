import { json, error } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '$lib/server/db';
import { deleteSubscriptionByEndpoint } from '$lib/server/push';
import type { RequestHandler } from './$types';

const unsubscribeSchema = v.object({
	endpoint: v.pipe(v.string(), v.url(), v.maxLength(2048))
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

	const parsed = v.safeParse(unsubscribeSchema, body);
	if (!parsed.success) {
		error(400, 'Invalid endpoint');
	}

	// Ownership-scoped: only deletes a row belonging to the current user.
	deleteSubscriptionByEndpoint(db, locals.user.id, parsed.output.endpoint);

	return json({ ok: true });
};
