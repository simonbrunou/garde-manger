import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readBunPins } from './bun-pins';

const ROOT = join(import.meta.dir, '..');

// The Dockerfile's shape today, with both tags on 1.4.4. Each failure-class test edits one line.
const DOCKERFILE = [
	'FROM oven/bun:1.4.4 AS build',
	'WORKDIR /app',
	'COPY package.json bun.lock ./',
	'RUN bun install --frozen-lockfile',
	'COPY . .',
	'RUN bun run build',
	'',
	'FROM oven/bun:1.4.4-slim',
	'WORKDIR /app',
	'ENV NODE_ENV=production',
	'COPY --from=build /app/build ./build',
	'COPY --from=build /app/package.json /app/bun.lock ./',
	'COPY --from=build /app/drizzle ./drizzle',
	'RUN bun install --frozen-lockfile --production',
	'EXPOSE 3000',
	'CMD ["bun", "./build/index.js"]',
	''
].join('\n');
const PACKAGE = JSON.stringify({ name: 'garde-manger', packageManager: 'bun@1.4.4' });

/** DOCKERFILE with its 1-based line `line` replaced by `text` (several lines when it holds \n). */
function withLine(line: number, text: string): string {
	const lines = DOCKERFILE.split('\n');
	lines[line - 1] = text;
	return lines.join('\n');
}

/** DOCKERFILE with `text` inserted before its 1-based line `line`. */
function insertBefore(line: number, text: string): string {
	const lines = DOCKERFILE.split('\n');
	lines.splice(line - 1, 0, text);
	return lines.join('\n');
}

function problems(dockerfile: string, packageJson = PACKAGE): string[] {
	const result = readBunPins(dockerfile, packageJson);
	if (!('problems' in result)) throw new Error(`expected problems, read ${result.version}`);
	return result.problems;
}

function pm(packageManager: unknown): string {
	return JSON.stringify({ name: 'garde-manger', packageManager });
}

describe('readBunPins', () => {
	it("reads the repo's own Dockerfile and package.json as one version", () => {
		const packageJson = readFileSync(join(ROOT, 'package.json'), 'utf8');
		const pinned = (JSON.parse(packageJson) as { packageManager: string }).packageManager;
		expect(readBunPins(readFileSync(join(ROOT, 'Dockerfile'), 'utf8'), packageJson)).toEqual({
			version: pinned.replace(/^bun@/, '')
		});
	});

	it('reads the fixture as one version', () => {
		expect(readBunPins(DOCKERFILE, PACKAGE)).toEqual({ version: '1.4.4' });
	});

	it('skips comment lines, a plain comment with a later = included', () => {
		const dockerfile = insertBefore(1, '# FROM oven/bun:9.9.9 AS build, see a=b');
		expect(readBunPins(dockerfile, PACKAGE)).toEqual({ version: '1.4.4' });
	});

	describe('rule 8: both tags name the packageManager version', () => {
		it('fails when the build tag differs', () => {
			expect(problems(withLine(1, 'FROM oven/bun:1.4.3 AS build'))).toEqual([
				"Dockerfile line 1: the build stage's oven/bun tag names Bun 1.4.3, but package.json's packageManager is bun@1.4.4"
			]);
		});

		it('fails when the runtime tag differs', () => {
			expect(problems(withLine(8, 'FROM oven/bun:1.4.5-slim'))).toEqual([
				"Dockerfile line 8: the runtime stage's oven/bun tag names Bun 1.4.5, but package.json's packageManager is bun@1.4.4"
			]);
		});

		it('fails on both lines when packageManager differs from both tags', () => {
			expect(problems(DOCKERFILE, pm('bun@1.5.0'))).toEqual([
				"Dockerfile line 1: the build stage's oven/bun tag names Bun 1.4.4, but package.json's packageManager is bun@1.5.0",
				"Dockerfile line 8: the runtime stage's oven/bun tag names Bun 1.4.4, but package.json's packageManager is bun@1.5.0"
			]);
		});
	});

	describe('rule 7: packageManager is a plain bun@x.y.z', () => {
		it.each([
			['missing', JSON.stringify({ name: 'garde-manger' }), 'missing'],
			['a range', pm('bun@^1.4.4'), '"bun@^1.4.4"'],
			['with a +sha512 suffix', pm('bun@1.4.4+sha512.abc'), '"bun@1.4.4+sha512.abc"'],
			['another manager', pm('npm@1.4.4'), '"npm@1.4.4"'],
			['two parts', pm('bun@1.4'), '"bun@1.4"'],
			['prefixed', pm('xbun@1.4.4'), '"xbun@1.4.4"'],
			['not a string', pm(144), '144']
		])('fails when packageManager is %s', (_, packageJson, shown) => {
			expect(problems(DOCKERFILE, packageJson)).toEqual([
				`package.json: packageManager is ${shown}, not "bun@<x.y.z>"`
			]);
		});

		it('fails when package.json is not JSON', () => {
			const found = problems(DOCKERFILE, '{"packageManager": "bun@1.4.4",}');
			expect(found).toHaveLength(1);
			expect(found[0]).toStartWith('package.json: not JSON (');
		});

		it.each(['null', '[]', '"bun@1.4.4"'])('fails when package.json is %s', (packageJson) => {
			expect(problems(DOCKERFILE, packageJson)).toEqual([
				`package.json: ${packageJson} is not a JSON object`
			]);
		});
	});

	describe('rule 1: printable ASCII, spaces and LF line ends only', () => {
		it.each([
			['a CR line end', withLine(1, 'FROM oven/bun:1.4.4 AS build\r'), 1, '000D', 29],
			['a tab', withLine(2, 'WORKDIR\t/app'), 2, '0009', 8],
			['a byte order mark', '\ufeff' + DOCKERFILE, 1, 'FEFF', 1],
			[
				'a non-breaking space before FROM',
				withLine(8, '\u00a0FROM oven/bun:1.4.4-slim'),
				8,
				'00A0',
				1
			],
			['a DEL', withLine(10, 'ENV NODE_ENV=production\x7f'), 10, '007F', 24],
			['a control character', withLine(15, 'EXPOSE\x0b3000'), 15, '000B', 7],
			['a line separator', withLine(15, 'EXPOSE\u20283000'), 15, '2028', 7]
		])('fails on %s', (_, dockerfile, line, code, column) => {
			expect(problems(dockerfile)).toContainEqual(
				expect.stringMatching(
					new RegExp(`^Dockerfile line ${line}: character U\\+${code} at column ${column} of `)
				)
			);
		});
	});

	describe('rule 2: no line continuation', () => {
		it.each([
			['a backslash splitting FROM', withLine(8, 'FR\\\nOM oven/bun:1.4.4-slim'), 8],
			['a backtick', withLine(4, 'RUN bun install `\n  --frozen-lockfile'), 4],
			['a backslash before trailing spaces', withLine(6, 'RUN bun run build \\  '), 6],
			['a backtick before trailing spaces', withLine(6, 'RUN bun run build `  '), 6]
		])('fails on %s', (_, dockerfile, line) => {
			expect(problems(dockerfile)).toContainEqual(
				expect.stringMatching(
					new RegExp(`^Dockerfile line ${line}: .* ends in a line continuation`)
				)
			);
		});
	});

	it('rule 3: fails on a heredoc', () => {
		const dockerfile = withLine(6, 'RUN <<EOF\nbun run build\nEOF');
		expect(problems(dockerfile)).toEqual(['Dockerfile line 6: "RUN <<EOF" holds a heredoc (<<)']);
	});

	describe('rule 4: no parser directive', () => {
		it.each([
			'# escape=`',
			'#syntax=docker/dockerfile:1',
			'# escape = \\',
			' # check=skip=all',
			'# SYNTAX=docker/dockerfile:1'
		])('fails on %s', (directive) => {
			expect(problems(insertBefore(1, directive))).toContainEqual(
				`Dockerfile line 1: ${JSON.stringify(directive)} has the form of a parser directive (# name=value)`
			);
		});
	});

	describe('rule 5: two FROM lines of the forms read today', () => {
		it.each([
			['lowercase from', 'from oven/bun:1.4.4 AS build'],
			['a leading space', ' FROM oven/bun:1.4.4 AS build'],
			['--platform=', 'FROM --platform=linux/amd64 oven/bun:1.4.4 AS build'],
			['a docker.io/ prefix', 'FROM docker.io/oven/bun:1.4.4 AS build'],
			['a digest', 'FROM oven/bun:1.4.4@sha256:0123abcd AS build'],
			['an untagged image', 'FROM oven/bun AS build'],
			['a ${...} image', 'FROM ${BUN_IMAGE} AS build'],
			['another image', 'FROM node:24 AS build'],
			['a trailing space', 'FROM oven/bun:1.4.4 AS build '],
			['a double space', 'FROM  oven/bun:1.4.4 AS build'],
			['lowercase as', 'FROM oven/bun:1.4.4 as build'],
			['a two-part version', 'FROM oven/bun:1.4 AS build'],
			['a four-part version', 'FROM oven/bun:1.4.4.1 AS build'],
			['an -alpine tag', 'FROM oven/bun:1.4.4-alpine AS build'],
			['an uppercase stage name', 'FROM oven/bun:1.4.4 AS Build'],
			['an inline comment', 'FROM oven/bun:1.4.4 AS build # pinned']
		])('fails on %s', (_, from) => {
			expect(problems(withLine(1, from))).toContainEqual(
				`Dockerfile line 1: ${JSON.stringify(from)} is neither "FROM oven/bun:<x.y.z> AS <name>" nor "FROM oven/bun:<x.y.z>-slim"`
			);
		});

		it('fails on a runtime line with a leading space', () => {
			const from = ' FROM oven/bun:1.4.4-slim';
			expect(problems(withLine(8, from))).toContainEqual(
				`Dockerfile line 8: ${JSON.stringify(from)} is neither "FROM oven/bun:<x.y.z> AS <name>" nor "FROM oven/bun:<x.y.z>-slim"`
			);
		});

		it('fails on a -slim tag with a stage name', () => {
			const from = 'FROM oven/bun:1.4.4-slim AS runtime';
			expect(problems(withLine(8, from))).toContainEqual(
				`Dockerfile line 8: ${JSON.stringify(from)} is neither "FROM oven/bun:<x.y.z> AS <name>" nor "FROM oven/bun:<x.y.z>-slim"`
			);
		});

		it('fails on a third stage', () => {
			const dockerfile = insertBefore(8, 'FROM oven/bun:1.4.4 AS test');
			expect(problems(dockerfile)).toEqual([
				'Dockerfile line 8: a second build stage "FROM oven/bun:1.4.4 AS test"; line 1 has the first'
			]);
		});

		it('fails on the runtime stage before the build stage', () => {
			const dockerfile = 'FROM oven/bun:1.4.4-slim\nFROM oven/bun:1.4.4 AS build\n';
			expect(problems(dockerfile)).toContainEqual(
				'Dockerfile line 2: the build stage "FROM oven/bun:1.4.4 AS build" follows the runtime stage on line 1'
			);
		});

		it('fails on a second runtime stage', () => {
			const dockerfile = withLine(17, 'FROM oven/bun:1.4.4-slim');
			expect(problems(dockerfile)).toEqual([
				'Dockerfile line 17: a second runtime stage "FROM oven/bun:1.4.4-slim"; line 8 has the first'
			]);
		});

		it('fails on a missing build stage', () => {
			const dockerfile = withLine(1, '');
			expect(problems(dockerfile)).toContainEqual(
				'Dockerfile: no build stage "FROM oven/bun:<x.y.z> AS <name>"'
			);
		});

		it('fails on a missing runtime stage', () => {
			expect(problems(withLine(8, ''))).toEqual([
				'Dockerfile: no runtime stage "FROM oven/bun:<x.y.z>-slim"'
			]);
		});
	});

	describe('rule 6: oven/bun and from only on the FROM lines and COPY --from=<build>', () => {
		it.each([
			['oven/bun on an ARG line', 2, 'ARG BUN_IMAGE=oven/bun:1.4.4'],
			['COPY --from= naming an image', 11, 'COPY --from=oven/bun:1.4.4 /usr/local/bin/bun ./'],
			['COPY --from= naming an undeclared stage', 11, 'COPY --from=deps /app/build ./build'],
			[
				'from= inside a RUN --mount',
				14,
				'RUN --mount=type=bind,from=node:24,target=/n bun install'
			],
			['COPY --from=build before the build stage', 1, 'COPY --from=build /app/build ./build'],
			[
				'a second --from on a COPY --from=build line',
				11,
				'COPY --from=build --from=deps /app/build ./build'
			],
			['a lowercase copy --from=build', 11, 'copy --from=build /app/build ./build'],
			['ONBUILD FROM', 15, 'ONBUILD FROM oven/bun:1.4.3'],
			['uppercase FROM with another image', 15, 'ONBUILD FROM node:24']
		])('fails on %s', (_, line, text) => {
			const dockerfile = line === 1 ? insertBefore(1, text) : withLine(line, text);
			expect(problems(dockerfile)).toContainEqual(
				expect.stringMatching(
					new RegExp(
						`^Dockerfile line ${line}: ${JSON.stringify(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} names oven/bun or "from" outside`
					)
				)
			);
		});
	});

	describe('rule 9: no backslash, and quotes only on a CMD [ line', () => {
		it.each([
			[
				'a double-quoted --from',
				'COPY --fr"o"m=oven/b"u"n:1.4.3 /usr/local/bin/bun /usr/local/bin/'
			],
			['a single-quoted --from', "COPY --fr'o'm=node:24 /a /b"],
			['a backslash-escaped --from', 'COPY --fr\\om=node:24 /a /b'],
			[
				'a quoted from= inside a RUN --mount',
				'RUN --mount=type=bind,fr"o"m=node:24,target=/n true'
			],
			['a quoted ARG value', 'ARG A="x"'],
			['a shell-form CMD with quotes', 'CMD "bun" ./build/index.js'],
			['a backslash on a CMD [ line', 'CMD ["bun", ".\\/build/index.js"]']
		])('fails on %s', (_, text) => {
			expect(problems(withLine(16, text))).toContainEqual(
				`Dockerfile line 16: ${JSON.stringify(text)} holds a backslash, or a quote outside a CMD [...] line, which BuildKit strips from flags`
			);
		});
	});
});
