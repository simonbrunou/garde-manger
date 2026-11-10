import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const SCRIPT = join(import.meta.dir, 'check-tsconfig-coverage.ts');

// The repos below must not see the caller's git config or a GIT_DIR a hook set. Without
// NODE_COMPILE_CACHE, as in CI, tsc caches its compiled code in TMPDIR (#83).
const ENV: Record<string, string> = {
	...Object.fromEntries(
		Object.entries(process.env).filter(
			(e): e is [string, string] =>
				!e[0].startsWith('GIT_') && e[0] !== 'NODE_COMPILE_CACHE' && e[1] !== undefined
		)
	),
	GIT_CONFIG_GLOBAL: '/dev/null',
	GIT_CONFIG_NOSYSTEM: '1',
	// git's messages, which a test matches, in English.
	LC_ALL: 'C'
};

// Each test runs the guard, which runs tsc. On the shared CI runner one test took over 5 s, Bun's
// default timeout, while it takes 0.1 to 0.7 s on an idle one. 30 s still fails a genuine hang.
const GUARD_TIMEOUT_MS = 30_000;

// One TMPDIR for the whole file, so each tsc run reuses the compile cache the first one wrote.
let guardTmp: string;
beforeAll(() => {
	guardTmp = mkdtempSync(join(tmpdir(), 'gm-tsconfig-coverage-tmp-'));
});
afterAll(() => rmSync(guardTmp, { recursive: true, force: true }));

let repo: string;
beforeEach(() => {
	repo = mkdtempSync(join(tmpdir(), 'gm-tsconfig-coverage-'));
	git('init', '-q');
	checkScript('svelte-check --tsconfig ./tsconfig.json');
	track('tsconfig.json', JSON.stringify({ include: ['src'], exclude: ['src/service-worker'] }));
	track('src/app.ts', 'export {};\n');
});
afterEach(() => rmSync(repo, { recursive: true, force: true }));

function git(...args: string[]) {
	const proc = Bun.spawnSync(['git', ...args], { cwd: repo, env: ENV });
	if (proc.exitCode !== 0) throw new Error(`git ${args.join(' ')}: ${proc.stderr.toString()}`);
}

function write(path: string, body: string) {
	mkdirSync(dirname(join(repo, path)), { recursive: true });
	writeFileSync(join(repo, path), body);
}

function track(path: string, body: string) {
	write(path, body);
	git('add', path);
}

function checkScript(check: string) {
	write('package.json', JSON.stringify({ scripts: { check } }));
}

function guard() {
	// The ceiling stops git from finding a repo above the fixture once its .git is gone.
	const env = { ...ENV, GIT_CEILING_DIRECTORIES: dirname(repo), TMPDIR: guardTmp };
	const proc = Bun.spawnSync([process.execPath, SCRIPT], { cwd: repo, env });
	const stdout = proc.stdout.toString();
	return { exitCode: proc.exitCode, stdout, output: stdout + proc.stderr.toString() };
}

describe('check-tsconfig-coverage.ts', () => {
	it(
		'passes when every tracked .ts file is in the tsconfig the check script names',
		() => {
			const r = guard();
			expect(r.exitCode).toBe(0);
			expect(r.stdout).toContain('tsconfig coverage: ok, all 1 tracked');
			expect(r.stdout).toContain('are in ./tsconfig.json');
		},
		GUARD_TIMEOUT_MS
	);

	it(
		'fails on a tracked .ts file outside include, and names only that file',
		() => {
			track('tests/e2e/smoke.spec.ts', 'export {};\n');
			const r = guard();
			expect(r.exitCode).toBe(1);
			expect(r.stdout).toContain('  tests/e2e/smoke.spec.ts');
			expect(r.stdout).not.toContain('src/app.ts');
		},
		GUARD_TIMEOUT_MS
	);

	it(
		'fails on tracked .mts and .cts files outside include',
		() => {
			track('playwright.config.mts', 'export {};\n');
			track('tools/legacy.cts', 'export {};\n');
			const r = guard();
			expect(r.exitCode).toBe(1);
			expect(r.stdout).toContain('  playwright.config.mts');
			expect(r.stdout).toContain('  tools/legacy.cts');
		},
		GUARD_TIMEOUT_MS
	);

	it(
		'ignores untracked .ts files and tracked files of other types',
		() => {
			write('stray.ts', 'export {};\n');
			track('eslint.config.js', 'export default [];\n');
			const r = guard();
			expect(r.exitCode).toBe(0);
			expect(r.stdout).toContain('all 1 tracked');
		},
		GUARD_TIMEOUT_MS
	);

	it(
		'counts a tsconfig the check script passes to tsc -p as a directory, from its own directory',
		() => {
			track('src/service-worker/tsconfig.json', JSON.stringify({ include: ['.'] }));
			track('src/service-worker/index.ts', 'export {};\n');
			checkScript('svelte-check --tsconfig ./tsconfig.json && tsc -p src/service-worker');
			const both = guard();
			expect(both.exitCode).toBe(0);
			expect(both.stdout).toContain('all 2 tracked');
		},
		GUARD_TIMEOUT_MS
	);

	it(
		'reads --tsconfig=, --project and -p from svelte-check and tsc steps',
		() => {
			track('src/service-worker/tsconfig.json', JSON.stringify({ include: ['.'] }));
			track('src/service-worker/index.ts', 'export {};\n');
			checkScript(
				'svelte-check --tsconfig=./tsconfig.json && tsc --noEmit --project src/service-worker/tsconfig.json'
			);
			const r = guard();
			expect(r.exitCode).toBe(0);
			expect(r.stdout).toContain('are in ./tsconfig.json, src/service-worker/tsconfig.json');
		},
		GUARD_TIMEOUT_MS
	);

	it(
		'ignores a tsconfig flag of a step that does not type-check',
		() => {
			track('tests/tsconfig.json', JSON.stringify({ include: ['.'] }));
			track('tests/a.ts', 'export {};\n');
			for (const check of [
				'svelte-check --tsconfig ./tsconfig.json && tsx --tsconfig tests/tsconfig.json a',
				'svelte-check --tsconfig ./tsconfig.json && X="a tsc -p tests b" tsx tests/a.ts'
			]) {
				checkScript(check);
				const r = guard();
				expect(r.exitCode, check).toBe(1);
				expect(r.stdout, check).toContain('  tests/a.ts');
			}
		},
		GUARD_TIMEOUT_MS
	);

	it(
		'reads a step run through npx or bunx after environment assignments',
		() => {
			track('src/service-worker/tsconfig.json', JSON.stringify({ include: ['.'] }));
			track('src/service-worker/index.ts', 'export {};\n');
			checkScript(
				`NODE_OPTIONS="--max-old-space-size=4096 --no-warnings" npx svelte-check --tsconfig ./tsconfig.json && A='b c' D=e bunx tsc -p src/service-worker`
			);
			const r = guard();
			expect(r.exitCode).toBe(0);
			expect(r.stdout).toContain('are in ./tsconfig.json, src/service-worker');
		},
		GUARD_TIMEOUT_MS
	);

	it(
		'fails when the check script joins steps with ;, | or ||, or runs cd',
		() => {
			track('tests/tsconfig.json', JSON.stringify({ include: ['.'] }));
			track('tests/a.ts', 'export {};\n');
			for (const check of [
				'svelte-check --tsconfig ./tsconfig.json; tsc -p tests',
				'svelte-check --tsconfig ./tsconfig.json && tsc -p tests || true',
				'svelte-check --tsconfig ./tsconfig.json && tsc -p tests | cat',
				'svelte-check --tsconfig ./tsconfig.json && cd tests && tsc -p .'
			]) {
				checkScript(check);
				const r = guard();
				expect(r.exitCode, check).toBe(2);
				expect(r.output, check).toContain('must join its steps with && only');
			}
		},
		GUARD_TIMEOUT_MS
	);

	it(
		'fails on the files of a tsconfig the check script stops type-checking',
		() => {
			track('src/service-worker/tsconfig.json', JSON.stringify({ include: ['.'] }));
			track('src/service-worker/index.ts', 'export {};\n');
			const r = guard();
			expect(r.exitCode).toBe(1);
			expect(r.stdout).toContain('  src/service-worker/index.ts');
		},
		GUARD_TIMEOUT_MS
	);

	it(
		'counts a file a tsconfig includes through a symlinked directory',
		() => {
			track('lib/shared.ts', 'export {};\n');
			symlinkSync('../lib', join(repo, 'src/lib'));
			const r = guard();
			expect(r.exitCode).toBe(0);
			expect(r.stdout).toContain('all 2 tracked');
		},
		GUARD_TIMEOUT_MS
	);

	it(
		'fails when a tsconfig the check script names does not exist',
		() => {
			checkScript('svelte-check --tsconfig ./tsconfig.json && tsc -p missing');
			const r = guard();
			expect(r.exitCode).toBe(1);
			expect(r.output).toContain('-p missing --showConfig exited');
			expect(r.output).not.toContain('tsconfig coverage: ok');
		},
		GUARD_TIMEOUT_MS
	);

	it(
		'fails when git cannot list the tracked files, instead of passing on none',
		() => {
			rmSync(join(repo, '.git'), { recursive: true, force: true });
			const r = guard();
			expect(r.exitCode).toBe(1);
			expect(r.output).toContain('not a git repository');
			expect(r.output).not.toContain('git lists no tracked');
			expect(r.output).not.toContain('tsconfig coverage: ok');
		},
		GUARD_TIMEOUT_MS
	);

	it(
		'fails when git lists no tracked TypeScript file, instead of passing on none',
		() => {
			git('rm', '-q', '--cached', 'src/app.ts');
			const r = guard();
			expect(r.exitCode).toBe(1);
			expect(r.output).toContain('git lists no tracked');
			expect(r.output).not.toContain('tsconfig coverage: ok');
		},
		GUARD_TIMEOUT_MS
	);

	it(
		'fails when the check script names no tsconfig',
		() => {
			checkScript('svelte-check');
			const r = guard();
			expect(r.exitCode).toBe(2);
			expect(r.output).toContain('runs no svelte-check or tsc step');
		},
		GUARD_TIMEOUT_MS
	);
});
