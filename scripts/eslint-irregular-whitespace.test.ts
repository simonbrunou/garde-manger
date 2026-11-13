import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// eslint.config.js runs no-irregular-whitespace on strings and templates too, since agents'
// Write and Edit tools have written an escaped no-break space as the character itself (#124).
// Each test lints a snippet with the repo's config, as bun run lint does, under the name of a
// file in the repo: for a .svelte name, the TypeScript project service must find the file.
const ROOT = join(import.meta.dir, '..');
const ESLINT = join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');

// Each test loads the ESLint config and its plugins; the shared CI runner can take longer than
// Bun's default 5 s timeout.
const TIMEOUT_MS = 30_000;

// ESLint caches its compiled code in TMPDIR when NODE_COMPILE_CACHE is unset, as in CI (#83).
let eslintTmp: string;
beforeAll(() => {
	eslintTmp = mkdtempSync(join(tmpdir(), 'gm-eslint-ws-tmp-'));
});
afterAll(() => rmSync(eslintTmp, { recursive: true, force: true }));

// Lints `source`. `passed` is whether ESLint exited 0, so a rule that only warns still passes.
function lint(source: string, filename = 'scripts/probe.ts') {
	const proc = Bun.spawnSync(
		[process.execPath, ESLINT, '--stdin', '--stdin-filename', filename, '--format', 'json'],
		{ cwd: ROOT, env: { ...process.env, TMPDIR: eslintTmp }, stdin: Buffer.from(source) }
	);
	let report: { messages: { ruleId: string | null }[] }[];
	try {
		report = JSON.parse(proc.stdout.toString());
	} catch {
		throw new Error(`eslint exited ${proc.exitCode}:\n${proc.stdout}${proc.stderr}`);
	}
	return {
		passed: proc.exitCode === 0,
		rules: report.flatMap((file) => file.messages.map((m) => m.ruleId))
	};
}

// The characters are built here so this file holds none of them.
const NBSP = String.fromCodePoint(0xa0);
const BOM = String.fromCodePoint(0xfeff);
const LINE_SEPARATOR = String.fromCodePoint(0x2028);
const ESCAPE = String.fromCodePoint(0x5c) + 'u00a0';

describe('no-irregular-whitespace in eslint.config.js', () => {
	it(
		'passes on a string that spells the character as an escape',
		() => {
			expect(lint(`export const a = '${ESCAPE}';\n`)).toEqual({ passed: true, rules: [] });
		},
		TIMEOUT_MS
	);

	it.each([
		['a no-break space in a string', `export const a = '${NBSP}';\n`],
		['a byte order mark in a string', `export const a = 'x${BOM}';\n`],
		['a line separator in a template', `export const a = \`a${LINE_SEPARATOR}b\`;\n`]
	])(
		'fails on %s',
		(_, source) => {
			expect(lint(source)).toEqual({ passed: false, rules: ['no-irregular-whitespace'] });
		},
		TIMEOUT_MS
	);

	it(
		'fails on a no-break space in a string in a Svelte component',
		() => {
			const source = `<script lang="ts">\n\tconst a = '${NBSP}';\n</script>\n\n<p>{a}</p>\n`;
			expect(lint(source, 'src/lib/components/BarcodeScanner.svelte')).toEqual({
				passed: false,
				rules: ['no-irregular-whitespace']
			});
		},
		TIMEOUT_MS
	);

	it(
		'passes on a line the ignore marker covers',
		() => {
			expect(
				lint(`// eslint-disable-next-line no-irregular-whitespace\nexport const a = '${NBSP}';\n`)
			).toEqual({ passed: true, rules: [] });
		},
		TIMEOUT_MS
	);
});
