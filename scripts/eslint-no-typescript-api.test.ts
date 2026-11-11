import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// eslint.config.js bans imports of the typescript package, since TypeScript 7 has no JavaScript
// API (#67, #113). Each test lints a snippet with the repo's config, as bun run lint does, under
// a file name in scripts/.
const ROOT = join(import.meta.dir, '..');
const ESLINT = join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');

// Each test loads the ESLint config and its plugins, which takes about a second on an idle
// machine; the shared CI runner can take longer than Bun's default 5 s timeout.
const TIMEOUT_MS = 30_000;

// ESLint caches its compiled code in TMPDIR when NODE_COMPILE_CACHE is unset, as in CI (#83).
let eslintTmp: string;
beforeAll(() => {
	eslintTmp = mkdtempSync(join(tmpdir(), 'gm-eslint-tmp-'));
});
afterAll(() => rmSync(eslintTmp, { recursive: true, force: true }));

function lint(source: string): (string | null)[] {
	const proc = Bun.spawnSync(
		[
			process.execPath,
			ESLINT,
			'--stdin',
			'--stdin-filename',
			'scripts/probe.ts',
			'--format',
			'json'
		],
		{ cwd: ROOT, env: { ...process.env, TMPDIR: eslintTmp }, stdin: Buffer.from(source) }
	);
	try {
		const report = JSON.parse(proc.stdout.toString()) as {
			messages: { ruleId: string | null }[];
		}[];
		return report.flatMap((file) => file.messages.map((m) => m.ruleId));
	} catch {
		throw new Error(`eslint exited ${proc.exitCode}:\n${proc.stdout}${proc.stderr}`);
	}
}

describe('no-restricted-imports on typescript', () => {
	it(
		'passes on an import of another package',
		() => {
			expect(lint("import { join } from 'node:path';\nexport default join;\n")).toEqual([]);
		},
		TIMEOUT_MS
	);

	it(
		'fails on a value import of typescript',
		() => {
			expect(lint("import ts from 'typescript';\nexport default ts;\n")).toEqual([
				'no-restricted-imports'
			]);
		},
		TIMEOUT_MS
	);

	it(
		'fails on a type-only import of typescript',
		() => {
			expect(
				lint("import type { Program } from 'typescript';\nexport type P = Program;\n")
			).toEqual(['no-restricted-imports']);
		},
		TIMEOUT_MS
	);

	it(
		'fails on a re-export from typescript',
		() => {
			expect(lint("export { version } from 'typescript';\n")).toEqual(['no-restricted-imports']);
		},
		TIMEOUT_MS
	);
});
