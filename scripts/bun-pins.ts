// Read the Bun version that the fallback Dockerfile's two `oven/bun` tags and package.json's
// `packageManager` name, and list each place where they differ (#124). bun-pins.test.ts runs it
// on the repo's own files, so CI's Unit tests step fails while the three differ.
//
// The runtime stage's FROM is a later stage, so no region of the Dockerfile can be read exactly
// without copying BuildKit's parser. The reader does not copy it. It accepts only the forms the
// Dockerfile uses today and reports every other form as a problem, naming its line:
//   1. Only printable ASCII, spaces and LF line ends (no CR, tab, byte order mark, Unicode space).
//   2. No line ends in `\` or a backtick before trailing spaces, so no line continues another.
//   3. No line contains `<<`, so no heredoc body reads as an instruction.
//   4. No comment line has the form of a parser directive (`# name=value`).
//   5. Each non-comment line whose first word is FROM, in any case, is exactly
//      `FROM oven/bun:<x.y.z> AS <name>` or `FROM oven/bun:<x.y.z>-slim`, and the file holds
//      exactly one of each.
//   6. Any other non-comment line holding `oven/bun`, or `from` in any case, fails, except
//      `COPY --from=<name> <rest>` after the build stage, where <name> is its AS name and <rest>
//      holds neither.
//   7. package.json's `packageManager` is a string `bun@<x.y.z>` and nothing else.
//   8. Both tags name the `packageManager` version.
// Add a test to bun-pins.test.ts for each form this reader learns to accept or reject.

export type BunPins = { version: string } | { problems: string[] };

const VERSION = '[0-9]+\\.[0-9]+\\.[0-9]+';
const BUILD_FROM = new RegExp(`^FROM oven/bun:(${VERSION}) AS ([a-z][a-z0-9_.-]*)$`);
const RUNTIME_FROM = new RegExp(`^FROM oven/bun:(${VERSION})-slim$`);
const PACKAGE_MANAGER = new RegExp(`^bun@(${VERSION})$`);

type Tag = { line: number; version: string };

export function readBunPins(dockerfile: string, packageJson: string): BunPins {
	const problems: string[] = [];
	const lines = dockerfile.split('\n');
	let build: (Tag & { name: string }) | undefined;
	let runtime: Tag | undefined;

	lines.forEach((text, index) => {
		const at = `Dockerfile line ${index + 1}`;
		const shown = JSON.stringify(text);

		// Rule 1.
		const odd = text.match(/[^\x20-\x7e]/);
		if (odd) {
			const code = odd[0].codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0');
			problems.push(
				`${at}: character U+${code} at column ${odd.index! + 1} of ${shown}; the Dockerfile may hold only printable ASCII, spaces and LF line ends`
			);
		}
		// Rule 2.
		if (/[\\`] *$/.test(text)) {
			problems.push(`${at}: ${shown} ends in a line continuation (\\ or \`)`);
		}
		// Rule 3.
		if (text.includes('<<')) {
			problems.push(`${at}: ${shown} holds a heredoc (<<)`);
		}

		if (/^ *#/.test(text)) {
			// Rule 4.
			if (/^ *# *[A-Za-z][A-Za-z0-9]* *=/.test(text)) {
				problems.push(`${at}: ${shown} has the form of a parser directive (# name=value)`);
			}
			return;
		}

		// Rule 5.
		if (text.replace(/^ +/, '').split(' ')[0].toUpperCase() === 'FROM') {
			const buildMatch = text.match(BUILD_FROM);
			const runtimeMatch = text.match(RUNTIME_FROM);
			if (buildMatch) {
				if (build) {
					problems.push(`${at}: a second build stage ${shown}; line ${build.line} has the first`);
				} else {
					build = { line: index + 1, version: buildMatch[1], name: buildMatch[2] };
				}
			} else if (runtimeMatch) {
				if (runtime) {
					problems.push(
						`${at}: a second runtime stage ${shown}; line ${runtime.line} has the first`
					);
				} else {
					runtime = { line: index + 1, version: runtimeMatch[1] };
				}
			} else {
				problems.push(
					`${at}: ${shown} is neither "FROM oven/bun:<x.y.z> AS <name>" nor "FROM oven/bun:<x.y.z>-slim"`
				);
			}
			return;
		}

		// Rule 6.
		let rest = text;
		const copy = text.match(/^COPY --from=(\S+) /);
		if (copy && build && copy[1] === build.name) rest = text.slice(copy[0].length);
		if (/from|oven\/bun/i.test(rest)) {
			problems.push(
				`${at}: ${shown} names oven/bun or "from" outside the two FROM lines and COPY --from=${build?.name ?? '<build stage>'}`
			);
		}
	});

	if (!build) problems.push('Dockerfile: no build stage "FROM oven/bun:<x.y.z> AS <name>"');
	if (!runtime) problems.push('Dockerfile: no runtime stage "FROM oven/bun:<x.y.z>-slim"');

	// Rule 7.
	let pin: string | undefined;
	let pkg: unknown;
	try {
		pkg = JSON.parse(packageJson);
	} catch (error) {
		problems.push(`package.json: not JSON (${(error as Error).message})`);
	}
	if (typeof pkg !== 'object' || pkg === null || Array.isArray(pkg)) {
		if (pkg !== undefined)
			problems.push(`package.json: ${JSON.stringify(pkg)} is not a JSON object`);
	} else {
		const field = (pkg as Record<string, unknown>).packageManager;
		const match = typeof field === 'string' ? field.match(PACKAGE_MANAGER) : null;
		if (match) {
			pin = match[1];
		} else {
			problems.push(
				`package.json: packageManager is ${JSON.stringify(field) ?? 'missing'}, not "bun@<x.y.z>"`
			);
		}
	}

	// Rule 8.
	if (pin !== undefined) {
		for (const [stage, tag] of [
			['build', build],
			['runtime', runtime]
		] as const) {
			if (tag && tag.version !== pin) {
				problems.push(
					`Dockerfile line ${tag.line}: the ${stage} stage's oven/bun tag names Bun ${tag.version}, but package.json's packageManager is bun@${pin}`
				);
			}
		}
	}

	return problems.length === 0 && pin !== undefined ? { version: pin } : { problems };
}
