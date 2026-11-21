import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join, posix } from 'node:path';

// A unit test that uses a database only as a fixture opens it in memory (#154). A file database
// syncs to disk on every commit, and on the loaded CI runner a beforeEach that migrated one passed
// Bun's 5 s timeout. The scan reads each src test file line by line. A line that names createDb,
// Database, bun:sqlite or db/client must be one of the forms src tests use today: a one-line
// `import { ... } from '...';` with no renames, a `createDb(':memory:')` or
// `new Database(':memory:'` call, or `let <name>: Database;`. It flags every other such line,
// comments and strings included, and every import of the app database, which opens
// DATABASE_PATH when it loads.
const ROOT = join(import.meta.dir, '..');

// Files that test the file database itself, each with its reason. In them the scan checks only
// imports, and that the file still opens a file database.
const FILE_DB_TESTS: Record<string, string> = {
	'src/lib/server/backup.test.ts': 'backupDatabase runs VACUUM INTO from a source file',
	'src/lib/server/db/client.test.ts': 'tests createDb on a file',
	'src/lib/server/health.test.ts': 'builds one database for one test, which #154 left as it was'
};

// src holds 33 test files today. Fewer than this means the glob read the wrong folder.
const MIN_TEST_FILES = 20;

const OPENER_MODULES = ['bun:sqlite', 'src/lib/server/db/client'];
const APP_DB_MODULES = ['src/lib/server/db', 'src/lib/server/db/index'];
// A lookahead, so that a quote earlier on the line, as in a comment's "don't", hides no string.
const STRING = /(?=(['"`])([^'"`\n]+)\1)/g;
const IMPORT_LINE = /^import (?:type )?\{([^}]*)\} from '[^']+';$/;
const LET_DATABASE = /^let \w+: Database;$/;
const MEMORY_CALLS = ["createDb(':memory:')", "new Database(':memory:'"];
const NAME = /\b(createDb|Database)\b/;
const OPENER = /\b(createDb|new Database)\(/;
const FILE_DB = "opens a file database; pass ':memory:'";

function moduleOf(file: string, specifier: string): string {
	const path = specifier.startsWith('.')
		? posix.join(posix.dirname(file), specifier)
		: specifier.replace(/^[$#]lib\//, 'src/lib/');
	return path.replace(/\.(ts|js)$/, '').replace(/\/$/, '');
}

function lineProblems(file: string, source: string, listed: boolean): string[] {
	const found: string[] = [];
	source.split('\n').forEach((raw, i) => {
		const at = `${file}:${i + 1}`;
		const line = raw.trim();
		const modules = [...line.matchAll(STRING)].map((m) => moduleOf(file, m[2]));
		if (modules.some((m) => APP_DB_MODULES.includes(m))) {
			found.push(`${at}: imports the app database, which opens DATABASE_PATH`);
			return;
		}
		const plainImport = IMPORT_LINE.exec(line);
		if (plainImport && !/\bas\b/.test(plainImport[1])) return;
		if (modules.some((m) => OPENER_MODULES.includes(m))) {
			found.push(
				`${at}: reaches bun:sqlite or db/client other than by a one-line import with no renames`
			);
			return;
		}
		if (listed) return;
		let rest = line.replace(LET_DATABASE, '');
		for (const call of MEMORY_CALLS) rest = rest.replaceAll(call, '');
		const opener = OPENER.exec(rest);
		if (opener) found.push(`${at}: ${opener[1]}( ${FILE_DB}`);
		else if (NAME.test(rest))
			found.push(`${at}: names createDb or Database in a form this scan does not read`);
	});
	return found;
}

// A listed file must still hold a line the scan would flag as opening a file database.
function opensFileDatabase(file: string, source: string): boolean {
	return lineProblems(file, source, false).some((p) => p.endsWith(FILE_DB));
}

function scan(sources: Record<string, string>, exceptions: Record<string, string>): string[] {
	const files = Object.keys(sources);
	if (files.length < MIN_TEST_FILES) {
		return [`found ${files.length} src test files, fewer than ${MIN_TEST_FILES}`];
	}
	const found = files.flatMap((f) => lineProblems(f, sources[f], f in exceptions));
	for (const f of Object.keys(exceptions)) {
		if (!(f in sources)) found.push(`${f}: listed in FILE_DB_TESTS but not found`);
		else if (!opensFileDatabase(f, sources[f])) {
			found.push(`${f}: listed in FILE_DB_TESTS but opens no file database`);
		}
	}
	return found;
}

function srcTests(): Record<string, string> {
	const files = [...new Bun.Glob('src/**/*.test.ts').scanSync({ cwd: ROOT })].sort();
	return Object.fromEntries(files.map((f) => [f, readFileSync(join(ROOT, f), 'utf8')]));
}

// A fixture tree: the given files beside enough empty tests to pass the MIN_TEST_FILES guard.
function tree(files: Record<string, string>, padding = MIN_TEST_FILES): Record<string, string> {
	const pad = Object.fromEntries(
		Array.from({ length: padding }, (_, i) => [`src/p${i}.test.ts`, ''])
	);
	return { ...pad, ...files };
}

const PROBE = 'src/lib/server/probe.test.ts';

function probe(lines: string[]): string[] {
	return scan(tree({ [PROBE]: lines.join('\n') }), {});
}

// The expected problem for each line number in `lines`.
function at(message: string, ...lines: number[]): string[] {
	return lines.map((n) => `${PROBE}:${n}: ${message}`);
}

const OPENS_FILE = (name: string) => `${name}( ${FILE_DB}`;
const OTHER_IMPORT =
	'reaches bun:sqlite or db/client other than by a one-line import with no renames';
const OTHER_NAME = 'names createDb or Database in a form this scan does not read';
const APP_DB = 'imports the app database, which opens DATABASE_PATH';

describe('fixture databases in src tests', () => {
	it('open in memory, outside the files that test the file database', () => {
		expect(scan(srcTests(), FILE_DB_TESTS)).toEqual([]);
	});

	it("passes today's forms: one-line imports, ':memory:' calls and a let", () => {
		const lines = [
			"import { createDb, runMigrations, type DB } from './db/client';",
			"import { createDb, runMigrations } from '../db/client.ts';",
			"import { createDb } from '#lib/server/db/client';",
			"import type { Database } from 'bun:sqlite';",
			"import { Database } from 'bun:sqlite';",
			'\tlet sqlite: Database;',
			"\tconst { db } = createDb(':memory:');",
			"\t({ db, sqlite } = createDb(':memory:'));",
			"const raw = new Database(':memory:', { strict: true });"
		];
		expect(probe(lines)).toEqual([]);
	});

	it('flags createDb or new Database on a file path, on one line or across lines', () => {
		const lines = [
			"const { db } = createDb(join(dir, 'test.db'));",
			'const { db: other } = createDb(',
			'\tpath',
			');',
			'const raw = new Database(destPath);',
			"createDb( ':memory:' );"
		];
		expect(probe(lines)).toEqual([
			...at(OPENS_FILE('createDb'), 1, 2),
			...at(OPENS_FILE('new Database'), 5),
			...at(OPENS_FILE('createDb'), 6)
		]);
	});

	it('flags every other import of bun:sqlite or db/client', () => {
		const lines = [
			"import { createDb as _open } from './db/client';",
			"/* don't */ import { createDb as open } from '#lib/server/db/client';",
			"import { type Statement, Database as $D } from 'bun:sqlite';",
			"import Sqlite from 'bun:sqlite';",
			"import * as client from '$lib/server/db/client';",
			'const { Database } = await import(`bun:sqlite`);',
			"const { createDb } = require('./db/client.ts');",
			"export { createDb } from './db/client';",
			"} from 'bun:sqlite';",
			"import { createDb } from './db/client'; const open = createDb;",
			"const open = createDb; import { Database } from 'bun:sqlite';"
		];
		expect(probe(lines)).toEqual(at(OTHER_IMPORT, ...lines.map((_, i) => i + 1)));
	});

	it('flags an import of the app database', () => {
		const lines = [
			"import { db } from '$lib/server/db';",
			"import { sqlite } from './db/index';",
			"import { db as appDb } from '#lib/server/db';"
		];
		expect(probe(lines)).toEqual(at(APP_DB, 1, 2, 3));
	});

	it('flags every other line that names createDb or Database', () => {
		const lines = [
			'const open = createDb;',
			'wrap(Database, path);',
			'const o = { open: createDb };',
			"const s = 'x'; const alias = createDb;",
			"/* don't */ const open = createDb;",
			'const t = { make: Database };',
			'const x = ok ? Other : Database;',
			"const s = 'import {'; const open = createDb;",
			'const u = `${createDb}`;',
			"createDb ('/tmp/x.db');",
			"new  Database(':memory:');",
			'\tDatabase as $D',
			"it('createDb enables foreign_keys', () => {});",
			'// createDb opens a file',
			'let sqlite: Database = other;'
		];
		expect(probe(lines)).toEqual(at(OTHER_NAME, ...lines.map((_, i) => i + 1)));
	});

	it('checks only imports in a listed file, and flags one that is missing or opens no file database', () => {
		const sources = tree({
			'src/opens.test.ts': [
				"import { createDb } from './lib/server/db/client';",
				"it('createDb on a file', () => {});",
				"const { db } = createDb(join(dir, 'x.db'));"
			].join('\n'),
			'src/memory.test.ts': "const { db } = createDb(':memory:');",
			'src/renamed.test.ts': [
				"import { createDb as open } from './lib/server/db/client';",
				"const { db } = open('/tmp/x.db');"
			].join('\n')
		});
		const listed = {
			'src/opens.test.ts': '',
			'src/memory.test.ts': '',
			'src/renamed.test.ts': '',
			'src/gone.test.ts': ''
		};
		expect(scan(sources, listed)).toEqual([
			`src/renamed.test.ts:1: ${OTHER_IMPORT}`,
			'src/memory.test.ts: listed in FILE_DB_TESTS but opens no file database',
			'src/renamed.test.ts: listed in FILE_DB_TESTS but opens no file database',
			'src/gone.test.ts: listed in FILE_DB_TESTS but not found'
		]);
	});

	it('flags a scan that finds fewer than MIN_TEST_FILES files', () => {
		expect(scan(tree({}, MIN_TEST_FILES - 1), {})).toEqual([
			`found ${MIN_TEST_FILES - 1} src test files, fewer than ${MIN_TEST_FILES}`
		]);
		expect(scan(tree({}, MIN_TEST_FILES), {})).toEqual([]);
	});
});
