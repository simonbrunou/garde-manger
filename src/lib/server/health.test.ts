import { test, expect, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDb } from './db/client';
import { checkHealth } from './health';

let dir: string;
afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

test('checkHealth reports ok when the DB answers', () => {
	dir = mkdtempSync(join(tmpdir(), 'gm-health-'));
	const { db } = createDb(join(dir, 'h.db'));
	const result = checkHealth(db);
	expect(result.status).toBe('ok');
	expect(result.db).toBe(true);
});
