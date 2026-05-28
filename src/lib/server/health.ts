import { sql } from 'drizzle-orm';
import type { DB } from './db/client';

export function checkHealth(db: DB): { status: 'ok' | 'error'; db: boolean } {
	try {
		db.get(sql`select 1`);
		return { status: 'ok', db: true };
	} catch (err) {
		console.error('[healthz] database check failed:', err);
		return { status: 'error', db: false };
	}
}
