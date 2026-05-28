import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { checkHealth } from '$lib/server/health';

export const prerender = false;

export function GET() {
	const health = checkHealth(db);
	return json(health, { status: health.status === 'ok' ? 200 : 503 });
}
