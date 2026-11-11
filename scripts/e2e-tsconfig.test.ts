import { describe, it, expect } from 'bun:test';
import { join, relative } from 'node:path';
import ts from 'typescript';

// Playwright loads the e2e specs, their fixtures and playwright.config.ts under Node, so
// tests/tsconfig.json type-checks them against Node types without Bun's (#113). Each test builds
// the program `tsc -p tests` checks, from that tsconfig, with a probe line appended to one real
// file in memory, so no probe touches the disk.
const ROOT = join(import.meta.dir, '..');
const CONFIG = join(ROOT, 'tests', 'tsconfig.json');

// Building the program parses the DOM and Node types. It takes about a second on an idle machine;
// the shared CI runner can take longer than Bun's default 5 s timeout.
const TIMEOUT_MS = 30_000;

function errors(file?: string, probe?: string): { file?: string; code: number }[] {
	const parsed = ts.getParsedCommandLineOfConfigFile(CONFIG, undefined, {
		...ts.sys,
		onUnRecoverableConfigFileDiagnostic: (d) => {
			throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
		}
	});
	if (!parsed) throw new Error(`cannot parse ${CONFIG}`);
	const host = ts.createCompilerHost(parsed.options);
	const target = file && join(ROOT, file);
	const readFile = host.readFile;
	host.readFile = (name) => {
		const text = readFile(name);
		return name === target && text !== undefined ? `${text}${probe}\n` : text;
	};
	const program = ts.createProgram({
		rootNames: parsed.fileNames,
		options: parsed.options,
		projectReferences: parsed.projectReferences,
		host
	});
	return [...parsed.errors, ...ts.getPreEmitDiagnostics(program)].map((d) => ({
		file: d.file && relative(ROOT, d.file.fileName),
		code: d.code
	}));
}

describe('tests/tsconfig.json', () => {
	it(
		'passes on the e2e files as they are',
		() => {
			expect(errors()).toEqual([]);
		},
		TIMEOUT_MS
	);

	it(
		'fails on the Bun global in a file under tests/e2e',
		() => {
			const file = 'tests/e2e/fixtures/constants.ts';
			expect(errors(file, 'export const bunProbe: string = Bun.version;')).toEqual([
				{ file, code: 2868 }
			]);
		},
		TIMEOUT_MS
	);

	it(
		'fails on the Bun global in playwright.config.ts',
		() => {
			const file = 'playwright.config.ts';
			expect(errors(file, 'export const bunProbe: string = Bun.version;')).toEqual([
				{ file, code: 2868 }
			]);
		},
		TIMEOUT_MS
	);

	it(
		'fails on a bun:* import in a file under tests/e2e',
		() => {
			const file = 'tests/e2e/fixtures/constants.ts';
			expect(errors(file, "import { Database } from 'bun:sqlite';")).toEqual([
				{ file, code: 2307 }
			]);
		},
		TIMEOUT_MS
	);

	it(
		'fails on a type error in a file under tests/e2e',
		() => {
			const file = 'tests/e2e/fixtures/dates.ts';
			expect(
				errors(file, 'const typeProbe: number = "not a number"; export { typeProbe };')
			).toEqual([{ file, code: 2322 }]);
		},
		TIMEOUT_MS
	);

	it(
		'checks the e2e files in strict mode',
		() => {
			const file = 'tests/e2e/fixtures/dates.ts';
			expect(errors(file, 'export const strictProbe: string = null;')).toEqual([
				{ file, code: 2322 }
			]);
		},
		TIMEOUT_MS
	);
});
