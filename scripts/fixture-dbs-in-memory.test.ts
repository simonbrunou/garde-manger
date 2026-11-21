import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join, posix } from 'node:path';

// A unit test that uses a database only as a fixture opens it in memory (#154). A file database
// syncs to disk on every commit, and on the loaded CI runner a beforeEach that migrated one passed
// Bun's 5 s timeout. The scan reads each src test file and flags every createDb( or
// new Database( call whose first argument is not the literal ':memory:'. It follows those two
// names only where a plain named import brings them in and a call uses them, so it also flags
// every other import of bun:sqlite or db/client, every other use of the two names outside a
// string and a `: Database` type, and any import of the app database, which opens DATABASE_PATH
// when it loads.
const ROOT = join(import.meta.dir, '..');

// Files that test the file database itself, each with its reason.
const FILE_DB_TESTS: Record<string, string> = {
	'src/lib/server/backup.test.ts': 'backupDatabase runs VACUUM INTO from a source file',
	'src/lib/server/db/client.test.ts': 'tests createDb on a file',
	'src/lib/server/health.test.ts': 'builds one database for one test, which #154 left as it was'
};

// src holds 33 test files today. Fewer than this means the glob read the wrong folder.
const MIN_TEST_FILES = 20;

const OPENER = /\b(createDb|new Database)\(\s*/g;
const MEMORY = /^':memory:'\s*[,)]/;
const OPENER_MODULES = ['bun:sqlite', 'src/lib/server/db/client'];
const APP_DB_MODULES = ['src/lib/server/db', 'src/lib/server/db/index'];
// A lookahead, so that a quote earlier on the line, as in a comment's "don't", hides no string.
const STRING = /(?=(['"`])([^'"`\n]+)\1)/g;
const NAME = /\b(createDb|Database)\b/g;
const IMPORT_CLAUSE = /import\s+(?:type\s+)?\{[^}]*\}/g;
const PAIRED = /(['"`])(?:(?!\1)[^\n])*\1/g;
const NAMED_IMPORT = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*$/;

function lineOf(source: string, index: number): number {
	return source.slice(0, index).split('\n').length;
}

function moduleOf(file: string, specifier: string): string {
	const path = specifier.startsWith('.')
		? posix.join(posix.dirname(file), specifier)
		: specifier.replace(/^[$#]lib\//, 'src/lib/');
	return path.replace(/\.(ts|js)$/, '').replace(/\/$/, '');
}

function fileOpeners(file: string, source: string): string[] {
	const found: string[] = [];
	for (const m of source.matchAll(OPENER)) {
		if (MEMORY.test(source.slice(m.index + m[0].length))) continue;
		found.push(
			`${file}:${lineOf(source, m.index)}: ${m[1]}( opens a file database; pass ':memory:'`
		);
	}
	return found;
}

function importProblems(file: string, source: string): string[] {
	const found: string[] = [];
	for (const m of source.matchAll(STRING)) {
		const target = moduleOf(file, m[2]);
		const at = `${file}:${lineOf(source, m.index)}`;
		if (APP_DB_MODULES.includes(target)) {
			found.push(`${at}: imports the app database, which opens DATABASE_PATH`);
		} else if (OPENER_MODULES.includes(target)) {
			const named = NAMED_IMPORT.exec(source.slice(0, m.index));
			if (!named) found.push(`${at}: reaches '${m[2]}' in a form this scan cannot follow`);
			else if (/\bas\b/.test(named[1])) found.push(`${at}: renames an import from '${m[2]}'`);
		}
	}
	return found;
}

function otherUses(file: string, source: string): string[] {
	const clauses = [...source.matchAll(IMPORT_CLAUSE)].map((m) => [m.index, m.index + m[0].length]);
	const found: string[] = [];
	for (const m of source.matchAll(NAME)) {
		if (/^\s*\(/.test(source.slice(m.index + m[0].length))) continue;
		if (clauses.some(([start, end]) => m.index >= start && m.index < end)) continue;
		const before = source.slice(source.lastIndexOf('\n', m.index) + 1, m.index);
		if (m[1] === 'Database' && /:\s*$/.test(before)) continue;
		if (/['"`]/.test(before.replace(PAIRED, ''))) continue;
		found.push(`${file}:${lineOf(source, m.index)}: uses ${m[1]} other than in a call`);
	}
	return found;
}

function scan(sources: Record<string, string>, exceptions: Record<string, string>): string[] {
	const files = Object.keys(sources);
	if (files.length < MIN_TEST_FILES) {
		return [`found ${files.length} src test files, fewer than ${MIN_TEST_FILES}`];
	}
	const found = files.flatMap((f) => [
		...importProblems(f, sources[f]),
		...otherUses(f, sources[f]),
		...(f in exceptions ? [] : fileOpeners(f, sources[f]))
	]);
	for (const f of Object.keys(exceptions)) {
		if (!(f in sources)) found.push(`${f}: listed in FILE_DB_TESTS but not found`);
		else if (fileOpeners(f, sources[f]).length === 0) {
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

function probe(source: string): string[] {
	return scan(tree({ 'src/lib/server/probe.test.ts': source }), {});
}

describe('fixture databases in src tests', () => {
	it('open in memory, outside the files that test the file database', () => {
		expect(scan(srcTests(), FILE_DB_TESTS)).toEqual([]);
	});

	it('passes a database opened in memory, and plain named imports', () => {
		const source = [
			"import { createDb, runMigrations, type DB } from './db/client';",
			"import type { Database } from 'bun:sqlite';",
			"import { Database } from 'bun:sqlite';",
			"const { db } = createDb(':memory:');",
			"({ db, sqlite } = createDb( ':memory:' ));",
			"const raw = new Database(':memory:', { strict: true });",
			'let sqlite: Database;',
			"test('createDb enables foreign_keys', () => {});"
		].join('\n');
		expect(probe(source)).toEqual([]);
	});

	it('flags createDb on a file path, on one line or across lines', () => {
		const source = [
			"const { db } = createDb(join(dir, 'test.db'));",
			'const { db: other } = createDb(',
			'\tpath',
			');'
		].join('\n');
		expect(probe(source)).toEqual([
			"src/lib/server/probe.test.ts:1: createDb( opens a file database; pass ':memory:'",
			"src/lib/server/probe.test.ts:2: createDb( opens a file database; pass ':memory:'"
		]);
	});

	it('flags new Database on a file path', () => {
		expect(probe('const raw = new Database(destPath);')).toEqual([
			"src/lib/server/probe.test.ts:1: new Database( opens a file database; pass ':memory:'"
		]);
	});

	it('flags an import that renames createDb or Database', () => {
		const source = [
			"import { createDb as _open } from './db/client';",
			'import {',
			'\ttype Statement,',
			'\tDatabase as $D',
			"} from 'bun:sqlite';",
			"/* don't */ import { createDb as open } from '#lib/server/db/client';"
		].join('\n');
		expect(probe(source)).toEqual([
			"src/lib/server/probe.test.ts:1: renames an import from './db/client'",
			"src/lib/server/probe.test.ts:5: renames an import from 'bun:sqlite'",
			"src/lib/server/probe.test.ts:6: renames an import from '#lib/server/db/client'"
		]);
	});

	it('flags every other way to reach bun:sqlite or db/client', () => {
		const source = [
			"import Sqlite from 'bun:sqlite';",
			"import * as client from '$lib/server/db/client';",
			'const { Database } = await import(`bun:sqlite`);',
			"const { createDb } = require('./db/client.ts');"
		].join('\n');
		expect(probe(source)).toEqual([
			"src/lib/server/probe.test.ts:1: reaches 'bun:sqlite' in a form this scan cannot follow",
			"src/lib/server/probe.test.ts:2: reaches '$lib/server/db/client' in a form this scan cannot follow",
			"src/lib/server/probe.test.ts:3: reaches 'bun:sqlite' in a form this scan cannot follow",
			"src/lib/server/probe.test.ts:4: reaches './db/client.ts' in a form this scan cannot follow",
			'src/lib/server/probe.test.ts:3: uses Database other than in a call',
			'src/lib/server/probe.test.ts:4: uses createDb other than in a call'
		]);
	});

	it('flags an import of the app database', () => {
		const source = [
			"import { db } from '$lib/server/db';",
			"import { sqlite } from './db/index';",
			"import { db as appDb } from '#lib/server/db';"
		].join('\n');
		expect(probe(source)).toEqual([
			'src/lib/server/probe.test.ts:1: imports the app database, which opens DATABASE_PATH',
			'src/lib/server/probe.test.ts:2: imports the app database, which opens DATABASE_PATH',
			'src/lib/server/probe.test.ts:3: imports the app database, which opens DATABASE_PATH'
		]);
	});

	it('flags createDb or Database used other than in a call', () => {
		const source = [
			'const open = createDb;',
			'wrap(Database, path);',
			'const o = { open: createDb };',
			"const s = 'x'; const alias = createDb;"
		].join('\n');
		expect(probe(source)).toEqual([
			'src/lib/server/probe.test.ts:1: uses createDb other than in a call',
			'src/lib/server/probe.test.ts:2: uses Database other than in a call',
			'src/lib/server/probe.test.ts:3: uses createDb other than in a call',
			'src/lib/server/probe.test.ts:4: uses createDb other than in a call'
		]);
	});

	it('flags a listed file that is missing or opens no file database', () => {
		const sources = tree({
			'src/listed.test.ts': "const { db } = createDb(':memory:');",
			'src/renamed.test.ts': [
				"import { createDb as open } from './lib/server/db/client';",
				"const { db } = open(':memory:');"
			].join('\n')
		});
		const listed = { 'src/listed.test.ts': '', 'src/renamed.test.ts': '', 'src/gone.test.ts': '' };
		expect(scan(sources, listed)).toEqual([
			"src/renamed.test.ts:1: renames an import from './lib/server/db/client'",
			'src/listed.test.ts: listed in FILE_DB_TESTS but opens no file database',
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
