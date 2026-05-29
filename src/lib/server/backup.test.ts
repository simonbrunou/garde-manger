import { describe, it, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDb, runMigrations } from './db/client';
import { users } from './db/schema';
import { backupDatabase } from './backup';

describe('backupDatabase (VACUUM INTO)', () => {
	it('writes a valid SQLite snapshot with the same data', () => {
		const srcPath = join(tmpdir(), `backup-src-${crypto.randomUUID()}.db`);
		const destPath = join(tmpdir(), `backup-dest-${crypto.randomUUID()}.db`);

		const { db, sqlite } = createDb(srcPath);
		runMigrations(db);
		for (let i = 0; i < 3; i++) {
			db.insert(users)
				.values({
					id: `u${i}`,
					email: `u${i}@ex.test`,
					displayName: `U${i}`,
					createdAt: new Date()
				})
				.run();
		}

		backupDatabase(sqlite, destPath);

		expect(existsSync(destPath)).toBe(true);
		expect(statSync(destPath).size).toBeGreaterThan(0);

		// Open the backup independently and confirm the rows survived.
		const restored = new Database(destPath, { readonly: true });
		const count = restored.query('SELECT count(*) AS n FROM users').get() as { n: number };
		expect(count.n).toBe(3);
		restored.close();
	});

	it("escapes single quotes in the destination path so it can't break the VACUUM statement", () => {
		const srcPath = join(tmpdir(), `backup-src-${crypto.randomUUID()}.db`);
		const destPath = join(tmpdir(), `backup ' dest-${crypto.randomUUID()}.db`);
		const { db, sqlite } = createDb(srcPath);
		runMigrations(db);
		backupDatabase(sqlite, destPath);
		expect(existsSync(destPath)).toBe(true);
	});
});
