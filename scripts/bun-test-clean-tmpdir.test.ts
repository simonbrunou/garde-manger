import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPT = join(import.meta.dir, 'bun-test-clean-tmpdir.sh');

let dir: string;
beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'gm-clean-tmpdir-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

// Writes one fixture test file outside src/, runs the script on it with its own
// TMPDIR, and returns the exit code, the output and what the script left in that TMPDIR.
function runScript(fixtureBody: string, scriptTmpdir?: string, env: Record<string, string> = {}) {
	const fixtures = join(dir, 'fixtures');
	const outerTmp = join(dir, 'tmp');
	mkdirSync(fixtures);
	mkdirSync(outerTmp);
	writeFileSync(
		join(fixtures, 'probe.test.ts'),
		`import { it, expect } from 'bun:test';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
it('probe', () => {
${fixtureBody}
});
`
	);
	const proc = Bun.spawnSync(['sh', SCRIPT, './fixtures'], {
		cwd: dir,
		env: { ...process.env, ...env, TMPDIR: scriptTmpdir ?? outerTmp }
	});
	return {
		exitCode: proc.exitCode,
		stdout: proc.stdout.toString(),
		outerTmpEntries: readdirSync(outerTmp)
	};
}

describe('bun-test-clean-tmpdir.sh', () => {
	it('passes and removes its TMPDIR when the tests leave nothing', () => {
		const r = runScript(`expect(1).toBe(1);`);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain('TMPDIR is empty after the unit tests');
		expect(r.outerTmpEntries).toEqual([]);
	});

	it('fails and names the entry when a test leaves a file in TMPDIR', () => {
		const r = runScript(`writeFileSync(join(tmpdir(), 'leak-probe.db'), '');`);
		expect(r.exitCode).toBe(1);
		expect(r.stdout).toContain('Unit tests left files in TMPDIR');
		expect(r.stdout).toContain('leak-probe.db');
	});

	it('fails when a test fails, even though it leaves nothing', () => {
		const r = runScript(`expect(1).toBe(2);`);
		expect(r.exitCode).not.toBe(0);
		expect(r.stdout).not.toContain('TMPDIR is empty after the unit tests');
	});

	it('runs the tests without NODE_COMPILE_CACHE, so a Node tool caches in TMPDIR as in CI', () => {
		const r = runScript(`expect(process.env.NODE_COMPILE_CACHE).toBeUndefined();`, undefined, {
			NODE_COMPILE_CACHE: join(dir, 'cache')
		});
		expect(r.exitCode).toBe(0);
	});

	it('stops before the tests run when mktemp fails', () => {
		const ran = join(dir, 'ran');
		const r = runScript(`writeFileSync(${JSON.stringify(ran)}, '');`, join(dir, 'missing'));
		expect(r.exitCode).not.toBe(0);
		expect(existsSync(ran)).toBe(false);
	});
});
