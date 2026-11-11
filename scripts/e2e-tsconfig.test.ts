import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';

// Playwright loads the e2e specs, their fixtures and playwright.config.ts under Node, so
// tests/tsconfig.json type-checks them against Node types without Bun's (#113). Each test runs
// `tsc -p tests`, as bun run check does, on a copy of the files that program reads, with a probe
// line appended to one of them. The test spawns the tsc CLI rather than importing the typescript
// package, because TypeScript 7 ships no JavaScript API (#67).
const ROOT = join(import.meta.dir, '..');
const TSC = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');

// The setup and each test run tsc, which takes about a second on an idle machine; the shared CI
// runner can take longer than Bun's default 5 s timeout.
const TIMEOUT_MS = 30_000;

let tmp: string;
let copy: string;
// tsc caches its compiled code in TMPDIR when NODE_COMPILE_CACHE is unset, as in CI (#83).
let env: Record<string, string | undefined>;

function tsc(cwd: string, ...args: string[]) {
	const proc = Bun.spawnSync([process.execPath, TSC, ...args], { cwd, env });
	return { exitCode: proc.exitCode, output: proc.stdout.toString() + proc.stderr.toString() };
}

beforeAll(() => {
	tmp = mkdtempSync(join(tmpdir(), 'gm-e2e-tsconfig-'));
	copy = join(tmp, 'repo');
	mkdirSync(join(tmp, 'tmp'));
	env = { ...process.env, TMPDIR: join(tmp, 'tmp') };
	const listed = tsc(ROOT, '-p', 'tests', '--listFilesOnly');
	if (listed.exitCode !== 0) throw new Error(`tsc -p tests --listFilesOnly:\n${listed.output}`);
	const files = listed.output
		.split('\n')
		.filter(Boolean)
		.map((file) => relative(ROOT, file))
		.filter((file) => !file.startsWith('..') && !file.startsWith('node_modules/'));
	for (const file of [...files, 'tests/tsconfig.json']) {
		mkdirSync(dirname(join(copy, file)), { recursive: true });
		copyFileSync(join(ROOT, file), join(copy, file));
	}
	symlinkSync(join(ROOT, 'node_modules'), join(copy, 'node_modules'));
}, TIMEOUT_MS);
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

// Runs `tsc -p tests` on the copy, with `probe` appended to `file` for that run only. It reports
// whether tsc exited 0, not the exit code: TypeScript 6 exits 2 on a type error and 7 exits 1, and
// the && in bun run check stops on either.
function check(file?: string, probe?: string) {
	const path = file && join(copy, file);
	const original = path && readFileSync(path, 'utf8');
	if (path) writeFileSync(path, `${original}${probe}\n`);
	try {
		const { exitCode, output } = tsc(copy, '-p', 'tests', '--pretty', 'false');
		const errors = [...output.matchAll(/^(.+)\(\d+,\d+\): error TS(\d+):/gm)].map((m) => ({
			file: m[1],
			code: Number(m[2])
		}));
		return { passed: exitCode === 0, errors };
	} finally {
		if (path) writeFileSync(path, original as string);
	}
}

describe('tests/tsconfig.json', () => {
	it(
		'passes on the e2e files as they are',
		() => {
			expect(check()).toEqual({ passed: true, errors: [] });
		},
		TIMEOUT_MS
	);

	it(
		'fails on the Bun global in a file under tests/e2e',
		() => {
			const file = 'tests/e2e/fixtures/constants.ts';
			expect(check(file, 'export const bunProbe: string = Bun.version;')).toEqual({
				passed: false,
				errors: [{ file, code: 2868 }]
			});
		},
		TIMEOUT_MS
	);

	it(
		'fails on the Bun global in playwright.config.ts',
		() => {
			const file = 'playwright.config.ts';
			expect(check(file, 'export const bunProbe: string = Bun.version;')).toEqual({
				passed: false,
				errors: [{ file, code: 2868 }]
			});
		},
		TIMEOUT_MS
	);

	it(
		'fails on a bun:* import in a file under tests/e2e',
		() => {
			const file = 'tests/e2e/fixtures/constants.ts';
			expect(check(file, "import { Database } from 'bun:sqlite';")).toEqual({
				passed: false,
				errors: [{ file, code: 2307 }]
			});
		},
		TIMEOUT_MS
	);

	it(
		'fails on a type error in a file under tests/e2e',
		() => {
			const file = 'tests/e2e/fixtures/dates.ts';
			expect(
				check(file, 'const typeProbe: number = "not a number"; export { typeProbe };')
			).toEqual({ passed: false, errors: [{ file, code: 2322 }] });
		},
		TIMEOUT_MS
	);

	it(
		'checks the e2e files in strict mode',
		() => {
			const file = 'tests/e2e/fixtures/dates.ts';
			expect(check(file, 'export const strictProbe: string = null;')).toEqual({
				passed: false,
				errors: [{ file, code: 2322 }]
			});
		},
		TIMEOUT_MS
	);
});
