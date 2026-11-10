import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const SCRIPT = join(import.meta.dir, 'check-tsconfig-coverage.ts');

// The repos below must not see the caller's git config or a GIT_DIR a hook set.
const ENV: Record<string, string> = {
	...Object.fromEntries(
		Object.entries(process.env).filter(
			(e): e is [string, string] => !e[0].startsWith('GIT_') && e[1] !== undefined
		)
	),
	GIT_CONFIG_GLOBAL: '/dev/null',
	GIT_CONFIG_NOSYSTEM: '1'
};

let repo: string;
beforeEach(() => {
	repo = mkdtempSync(join(tmpdir(), 'gm-tsconfig-coverage-'));
	git('init', '-q');
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

function guard(...configs: string[]) {
	// The ceiling stops git from finding a repo above the fixture once its .git is gone.
	const env = { ...ENV, GIT_CEILING_DIRECTORIES: dirname(repo) };
	const proc = Bun.spawnSync([process.execPath, SCRIPT, ...configs], { cwd: repo, env });
	const stdout = proc.stdout.toString();
	return { exitCode: proc.exitCode, stdout, output: stdout + proc.stderr.toString() };
}

describe('check-tsconfig-coverage.ts', () => {
	it('passes when every tracked .ts file is in the tsconfig', () => {
		const r = guard('tsconfig.json');
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain('tsconfig coverage: ok, all 1 tracked');
	});

	it('fails on a tracked .ts file outside include, and names only that file', () => {
		track('tests/e2e/smoke.spec.ts', 'export {};\n');
		const r = guard('tsconfig.json');
		expect(r.exitCode).toBe(1);
		expect(r.stdout).toContain('  tests/e2e/smoke.spec.ts');
		expect(r.stdout).not.toContain('src/app.ts');
	});

	it('fails on tracked .mts and .cts files outside include', () => {
		track('playwright.config.mts', 'export {};\n');
		track('tools/legacy.cts', 'export {};\n');
		const r = guard('tsconfig.json');
		expect(r.exitCode).toBe(1);
		expect(r.stdout).toContain('  playwright.config.mts');
		expect(r.stdout).toContain('  tools/legacy.cts');
	});

	it('ignores untracked .ts files and tracked files of other types', () => {
		write('stray.ts', 'export {};\n');
		track('eslint.config.js', 'export default [];\n');
		const r = guard('tsconfig.json');
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain('all 1 tracked');
	});

	it("reads a nested tsconfig's files from its own directory", () => {
		track('src/service-worker/tsconfig.json', JSON.stringify({ include: ['.'] }));
		track('src/service-worker/index.ts', 'export {};\n');
		const both = guard('tsconfig.json', 'src/service-worker/tsconfig.json');
		expect(both.exitCode).toBe(0);
		expect(both.stdout).toContain('all 2 tracked');
		const rootOnly = guard('tsconfig.json');
		expect(rootOnly.exitCode).toBe(1);
		expect(rootOnly.stdout).toContain('  src/service-worker/index.ts');
	});

	it('fails when a tsconfig does not exist', () => {
		const r = guard('tsconfig.json', 'missing/tsconfig.json');
		expect(r.exitCode).toBe(1);
		expect(r.output).toContain('missing/tsconfig.json');
		expect(r.output).not.toContain('tsconfig coverage: ok');
	});

	it('fails when git cannot list the tracked files, instead of passing on none', () => {
		rmSync(join(repo, '.git'), { recursive: true, force: true });
		const r = guard('tsconfig.json');
		expect(r.exitCode).toBe(1);
		expect(r.output).toContain('git ls-files');
		expect(r.output).not.toContain('tsconfig coverage: ok');
	});

	it('fails when given no tsconfig', () => {
		const r = guard();
		expect(r.exitCode).toBe(2);
		expect(r.output).toContain('usage:');
	});
});
