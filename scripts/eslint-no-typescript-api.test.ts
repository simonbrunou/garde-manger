import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// eslint.config.js rejects imports, import() calls, import('typescript').X types and require or
// createRequire(...) calls that name the typescript package or a file in it by a string literal,
// since TypeScript 7 ships no compiler API (#67, #113). A require bound to another name passes.
// Each test lints a snippet with the repo's config, as bun run lint does, under a file name in
// scripts/.
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

// Lints `source`. `passed` is whether ESLint exited 0, so a rule that only warns still passes.
function lint(source: string) {
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
	let report: { messages: { ruleId: string | null; message: string }[] }[];
	try {
		report = JSON.parse(proc.stdout.toString());
	} catch {
		throw new Error(`eslint exited ${proc.exitCode}:\n${proc.stdout}${proc.stderr}`);
	}
	const messages = report.flatMap((file) => file.messages);
	return {
		passed: proc.exitCode === 0,
		rules: messages.map((m) => m.ruleId),
		messages: messages.map((m) => m.message)
	};
}

// The value import is the form the #113 test used.
const VALUE_IMPORT = "import ts from 'typescript';\nexport default ts;\n";

describe('the typescript package ban in eslint.config.js', () => {
	it(
		'passes on other packages, and on code that names typescript without loading it',
		() => {
			const source = [
				"import { join } from 'node:path';",
				"import tseslint from 'typescript-eslint';",
				"export const parser = await import('typescript-eslint');",
				"export const tsc = import.meta.resolve('typescript/bin/tsc');",
				"export const language = String('typescript');",
				'export default [join, tseslint];',
				''
			].join('\n');
			expect(lint(source)).toMatchObject({ passed: true, rules: [] });
		},
		TIMEOUT_MS
	);

	it(
		'fails on a value import, and names the tsc CLI',
		() => {
			const result = lint(VALUE_IMPORT);
			expect(result).toMatchObject({ passed: false, rules: ['no-restricted-imports'] });
			expect(result.messages[0]).toContain('node_modules/typescript/bin/tsc');
		},
		TIMEOUT_MS
	);

	it(
		'fails on a type-only import',
		() => {
			expect(
				lint("import type { Program } from 'typescript';\nexport type P = Program;\n")
			).toMatchObject({ passed: false, rules: ['no-restricted-imports'] });
		},
		TIMEOUT_MS
	);

	it(
		'fails on a re-export',
		() => {
			expect(lint("export { version } from 'typescript';\n")).toMatchObject({
				passed: false,
				rules: ['no-restricted-imports']
			});
		},
		TIMEOUT_MS
	);

	it(
		'fails on an import of a file in the package',
		() => {
			expect(
				lint("import ts from 'typescript/lib/typescript.js';\nexport default ts;\n")
			).toMatchObject({ passed: false, rules: ['no-restricted-imports'] });
		},
		TIMEOUT_MS
	);

	it(
		'fails on a dynamic import',
		() => {
			expect(lint("export const ts = await import('typescript');\n")).toMatchObject({
				passed: false,
				rules: ['no-restricted-syntax']
			});
		},
		TIMEOUT_MS
	);

	it(
		'fails on a dynamic import of a file in the package, and names the tsc CLI',
		() => {
			const result = lint("export const ts = await import('typescript/lib/typescript.js');\n");
			expect(result).toMatchObject({ passed: false, rules: ['no-restricted-syntax'] });
			expect(result.messages[0]).toContain('node_modules/typescript/bin/tsc');
		},
		TIMEOUT_MS
	);

	it(
		'fails on an import type, and names the tsc CLI',
		() => {
			const result = lint("export type P = import('typescript').Program;\n");
			expect(result).toMatchObject({ passed: false, rules: ['no-restricted-syntax'] });
			expect(result.messages[0]).toContain('node_modules/typescript/bin/tsc');
		},
		TIMEOUT_MS
	);

	it(
		'fails on a require',
		() => {
			// @typescript-eslint/no-require-imports flags any require in a .ts file as well.
			const result = lint("export default require('typescript');\n");
			expect(result.passed).toBe(false);
			expect(result.rules).toContain('no-restricted-syntax');
		},
		TIMEOUT_MS
	);

	it(
		'fails on a require through createRequire, and names the tsc CLI',
		() => {
			const source = [
				"import { createRequire } from 'node:module';",
				"export default createRequire(import.meta.url)('typescript');",
				''
			].join('\n');
			const result = lint(source);
			expect(result).toMatchObject({ passed: false, rules: ['no-restricted-syntax'] });
			expect(result.messages[0]).toContain('node_modules/typescript/bin/tsc');
		},
		TIMEOUT_MS
	);

	it(
		'passes on a line the ignore marker covers',
		() => {
			expect(
				lint(`// eslint-disable-next-line no-restricted-imports\n${VALUE_IMPORT}`)
			).toMatchObject({ passed: true, rules: [] });
		},
		TIMEOUT_MS
	);
});
