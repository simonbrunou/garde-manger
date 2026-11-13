import { describe, it, expect } from 'bun:test';
import { join } from 'node:path';

// tests/e2e/fixtures/constants.ts reads the e2e port from PORT when a process imports it (#127).
// Each case imports the module in a fresh Bun process with PORT set or unset and checks what PORT
// and BASE_URL become, or that loading throws.
const CONSTANTS = join(import.meta.dir, '..', 'tests', 'e2e', 'fixtures', 'constants.ts');
const PRINT = `import(${JSON.stringify(CONSTANTS)}).then((m) => console.log(m.PORT, m.BASE_URL))`;

function load(port: string | undefined) {
	const env: Record<string, string | undefined> = { ...process.env, PORT: port };
	if (port === undefined) delete env.PORT;
	// Bun loads a .env in the working directory; a PORT there would set the unset case.
	const proc = Bun.spawnSync([process.execPath, '--no-env-file', '-e', PRINT], { env });
	return {
		exitCode: proc.exitCode,
		stdout: proc.stdout.toString().trim(),
		stderr: proc.stderr.toString()
	};
}

describe('e2e PORT', () => {
	it('is 4173 when PORT is unset, as in CI', () => {
		expect(load(undefined)).toMatchObject({ exitCode: 0, stdout: '4173 http://localhost:4173' });
	});

	for (const [raw, port] of [
		['4127', 4127],
		['1', 1],
		['65535', 65535],
		['04127', 4127]
	] as const) {
		it(`takes PORT=${JSON.stringify(raw)} as ${port}`, () => {
			expect(load(raw)).toMatchObject({
				exitCode: 0,
				stdout: `${port} http://localhost:${port}`
			});
		});
	}

	for (const raw of ['', 'abc', '0', '65536', '4127x', ' 4127', '1e3', '-1', '41.5']) {
		it(`rejects PORT=${JSON.stringify(raw)} with an error naming PORT`, () => {
			const r = load(raw);
			expect(r.exitCode).not.toBe(0);
			expect(r.stderr).toContain(
				`PORT must be a whole number from 1 to 65535 or unset, got ${JSON.stringify(raw)}`
			);
		});
	}
});
