import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { runDailyReminders, secretMatches } from '$lib/server/cron';
import { getVapid } from '$lib/server/pushConfig';
import { webPushSender } from '$lib/server/webPushSender';
import type { RequestHandler } from './$types';

/**
 * Daily expiry-reminder trigger. Lives OUTSIDE the `(app)` group, so no session
 * or layout auth runs — the ONLY gate is the `CRON_SECRET`. The presented secret
 * may arrive in `x-cron-secret` or as `Authorization: Bearer <secret>`, and is
 * compared in constant time. The response body is aggregate counts only — never
 * user data, emails or endpoints.
 */
export const POST: RequestHandler = async ({ request }) => {
	const expected = env.CRON_SECRET ?? '';
	// An empty/unset secret must NOT become an open door: refuse to run rather
	// than allow an empty-secret bypass.
	if (!expected) {
		error(503, 'cron not configured');
	}

	const headerSecret = request.headers.get('x-cron-secret');
	const bearer = request.headers.get('authorization');
	const presented =
		headerSecret ??
		(bearer && bearer.startsWith('Bearer ') ? bearer.slice('Bearer '.length) : null);

	if (!secretMatches(expected, presented)) {
		error(401, 'unauthorized');
	}

	const origin = env.ORIGIN || new URL(request.url).origin;

	const summary = await runDailyReminders(db, {
		vapid: getVapid(),
		sender: webPushSender,
		origin
	});

	return json(summary);
};
