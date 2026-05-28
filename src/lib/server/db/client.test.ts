import { test, expect, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { createDb, runMigrations } from './client';
import { users } from './schema';

let dir: string;
afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

test('createDb enables foreign_keys and migrations create a usable users table', () => {
	dir = mkdtempSync(join(tmpdir(), 'gm-db-'));
	const { db, sqlite } = createDb(join(dir, 'test.db'));

	const fk = sqlite.query('PRAGMA foreign_keys;').get() as { foreign_keys: number };
	expect(fk.foreign_keys).toBe(1);

	runMigrations(db); // applies ./drizzle migrations

	db.insert(users)
		.values({ id: 'u1', email: 'a@b.fr', displayName: 'Alice', locale: 'fr', createdAt: new Date() })
		.run();

	const row = db.select().from(users).where(eq(users.email, 'a@b.fr')).get();
	expect(row?.displayName).toBe('Alice');
	sqlite.close();
});
