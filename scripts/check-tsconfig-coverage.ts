// Fail when a tracked .ts, .mts or .cts file is in none of the tsconfigs that `bun run check`
// type-checks, as scripts/ was until #89 and tests/ until #99. The guard takes those tsconfigs
// from the check script in package.json (each path after `--tsconfig` or `-p`), so the list has
// one home, and reads each file list from `tsc --showConfig`, the list svelte-check and tsc use.
// Usage, from the repo root: bun scripts/check-tsconfig-coverage.ts
import { realpathSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

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

const pkg = (await Bun.file('package.json').json()) as { scripts?: { check?: string } };
const configs = [...(pkg.scripts?.check ?? '').matchAll(/(?:^|\s)(?:--tsconfig|-p)[ =](\S+)/g)].map(
	(m) => m[1]
);
if (configs.length === 0) {
	console.error('The check script in package.json names no tsconfig after --tsconfig or -p.');
	process.exit(2);
}

const covered = new Set<string>();
for (const config of configs) {
	const shown = JSON.parse(run([process.execPath, TSC, '-p', config, '--showConfig'])) as {
		files?: string[];
	};
	// --showConfig lists each file relative to the tsconfig's directory, which -p also accepts.
	// git lists a file under its real path, so a file reached through a symlink resolves first.
	const dir = statSync(config).isDirectory() ? config : dirname(config);
	for (const file of shown.files ?? []) covered.add(relative('.', realpathSync(join(dir, file))));
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
		'Add each to the include of one of those tsconfigs, or type-check its own tsconfig in the check script of package.json.'
	);
	process.exit(1);
}
console.log(
	`tsconfig coverage: ok, all ${tracked.length} tracked .ts, .mts and .cts files are in ${configs.join(', ')}`
);
