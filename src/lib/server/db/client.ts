import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { drizzle, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import * as schema from './schema';

export type DB = BunSQLiteDatabase<typeof schema>;

/**
 * Open a SQLite database with our standard pragmas. No SvelteKit imports → unit-testable.
 * Pass ':memory:' for tests (WAL is skipped for in-memory DBs).
 */
export function createDb(path: string): { db: DB; sqlite: Database } {
	if (path !== ':memory:') {
		mkdirSync(dirname(path), { recursive: true }); // ensure the DB's parent dir exists
	}
	const sqlite = new Database(path, { create: true });

	if (path !== ':memory:') {
		// Enable WAL and fail loudly if it didn't take (durability matters for a storage layer).
		const row = sqlite.query<{ journal_mode: string }, []>('PRAGMA journal_mode = WAL').get();
		if (row?.journal_mode !== 'wal') {
			throw new Error(`Failed to enable WAL mode; got '${row?.journal_mode}'`);
		}
	}
	sqlite.exec('PRAGMA foreign_keys = ON;');
	sqlite.exec('PRAGMA busy_timeout = 5000;');

	const db = drizzle(sqlite, { schema });
	return { db, sqlite };
}

// migrationsFolder is resolved against the process CWD (the project root, where the app is started).
export function runMigrations(db: DB, migrationsFolder = './drizzle'): void {
	migrate(db, { migrationsFolder });
}
