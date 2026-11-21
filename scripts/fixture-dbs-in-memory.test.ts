import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// A unit test that uses a database only as a fixture opens it in memory (#154). A file database
// syncs to disk on every commit, and on the loaded CI runner a beforeEach that migrated one passed
// Bun's 5 s timeout. The scan reads each src test file and flags every createDb( or
// new Database( call whose first argument is not the literal ':memory:', and every import that
// renames createDb, since the scan would miss its calls.
const ROOT = join(import.meta.dir, '..');

// Files that test the file database itself, each with its reason.
const FILE_DB_TESTS: Record<string, string> = {
	'src/lib/server/backup.test.ts': 'backupDatabase runs VACUUM INTO from a source file',
	'src/lib/server/db/client.test.ts': 'tests createDb on a file',
	'src/lib/server/health.test.ts': 'builds one database for one test, which #154 left as it was'
};

const OPENER = /\b(createDb|new Database)\(\s*/g;
const MEMORY = /^':memory:'\s*[,)]/;
const RENAMED = /\bcreateDb\s+as\s+\w+/;

function fileFixtures(path: string, source: string): string[] {
	const found: string[] = [];
	for (const m of source.matchAll(OPENER)) {
		if (MEMORY.test(source.slice(m.index + m[0].length))) continue;
		const line = source.slice(0, m.index).split('\n').length;
		found.push(`${path}:${line}: ${m[1]}( opens a file database; pass ':memory:'`);
	}
	if (RENAMED.test(source)) found.push(`${path}: renames createDb, which this scan cannot follow`);
	return found;
}

function testFiles(): string[] {
	return [...new Bun.Glob('src/**/*.test.ts').scanSync({ cwd: ROOT })].sort();
}

describe('fixture databases in src tests', () => {
	it('open in memory, outside the files that test the file database', () => {
		const files = testFiles();
		expect(files.length).toBeGreaterThan(20);
		const found = files
			.filter((f) => !(f in FILE_DB_TESTS))
			.flatMap((f) => fileFixtures(f, readFileSync(join(ROOT, f), 'utf8')));
		expect(found).toEqual([]);
	});

	it('lists only files that still open a file database', () => {
		const stale = Object.keys(FILE_DB_TESTS).filter((f) => {
			let source: string;
			try {
				source = readFileSync(join(ROOT, f), 'utf8');
			} catch {
				return true;
			}
			return fileFixtures(f, source).length === 0;
		});
		expect(stale).toEqual([]);
	});

	it('passes a database opened in memory', () => {
		const source = [
			"const { db } = createDb(':memory:');",
			"({ db, sqlite } = createDb( ':memory:' ));",
			"const raw = new Database(':memory:', { strict: true });"
		].join('\n');
		expect(fileFixtures('probe.test.ts', source)).toEqual([]);
	});

	it('flags createDb on a file path, on one line or across lines', () => {
		const source = [
			"const { db } = createDb(join(dir, 'test.db'));",
			'const { db: other } = createDb(',
			'\tpath',
			');'
		].join('\n');
		expect(fileFixtures('probe.test.ts', source)).toEqual([
			"probe.test.ts:1: createDb( opens a file database; pass ':memory:'",
			"probe.test.ts:2: createDb( opens a file database; pass ':memory:'"
		]);
	});

	it('flags new Database on a file path', () => {
		expect(fileFixtures('probe.test.ts', 'const raw = new Database(destPath);')).toEqual([
			"probe.test.ts:1: new Database( opens a file database; pass ':memory:'"
		]);
	});

	it('flags an import that renames createDb', () => {
		expect(
			fileFixtures('probe.test.ts', "import { createDb as open } from './db/client';")
		).toEqual(['probe.test.ts: renames createDb, which this scan cannot follow']);
	});
});
