// Fail when a tracked .ts, .mts or .cts file is in none of the tsconfigs given on the command
// line. The check script in package.json passes every tsconfig it type-checks, so a file this
// guard names is one that `bun run check` never checks, as scripts/ was until #89 and tests/
// until #99. It reads each file list from `tsc --showConfig`, the list svelte-check and tsc use.
// Usage, from the repo root: bun scripts/check-tsconfig-coverage.ts <path to tsconfig.json>...
import { dirname, join, relative, resolve } from 'node:path';

const TSC = join(import.meta.dir, '..', 'node_modules', 'typescript', 'bin', 'tsc');

function run(cmd: string[]): string {
	const proc = Bun.spawnSync(cmd);
	if (proc.exitCode !== 0) {
		console.error(`${cmd.join(' ')} exited ${proc.exitCode}:`);
		console.error(proc.stdout.toString() + proc.stderr.toString());
		process.exit(1);
	}
	return proc.stdout.toString();
}

const configs = process.argv.slice(2);
if (configs.length === 0) {
	console.error('usage: bun scripts/check-tsconfig-coverage.ts <path to tsconfig.json>...');
	process.exit(2);
}

const covered = new Set<string>();
for (const config of configs) {
	const shown = JSON.parse(run([process.execPath, TSC, '-p', config, '--showConfig'])) as {
		files?: string[];
	};
	// --showConfig lists each file relative to the tsconfig's own directory.
	for (const file of shown.files ?? []) covered.add(relative('.', resolve(dirname(config), file)));
}

const tracked = run(['git', 'ls-files', '-z', '--', '*.ts', '*.mts', '*.cts'])
	.split('\0')
	.filter(Boolean);
const missing = tracked.filter((file) => !covered.has(file));
if (missing.length > 0) {
	console.log(
		`These tracked files are in none of ${configs.join(', ')}, so bun run check never type-checks them:`
	);
	for (const file of missing) console.log(`  ${file}`);
	console.log(
		'Add each to the include of one of those tsconfigs. A file that needs its own tsconfig gets it type-checked in the check script of package.json and passed to this guard there.'
	);
	process.exit(1);
}
console.log(
	`tsconfig coverage: ok, all ${tracked.length} tracked .ts, .mts and .cts files are in ${configs.join(', ')}`
);
