// Tells the merging agent whether the CI run that a merge starts on `main` repeats the PR run's
// jobs and steps (AGENTS.md, "Merge authority"). It ports simonbrunou.bzh's
// scripts/check-push-repeats-pr.js (simonbrunou.bzh#162) to this repo (#105). Run it from a
// checkout with its dependencies installed, after `git fetch origin`, with the SHA the PR's CI
// passed:
//
//   bun scripts/check-push-repeats-pr.ts <pushed SHA>
//
// It reads the files at that SHA through git, not the working tree, and prints each difference
// it finds:
//
// - a workflow anywhere under .forgejo/workflows/ that lacks a `push` or a `pull_request`
//   trigger, filters either one beyond `branches: [main]`, or has a trigger other than those
//   two, `schedule` and `workflow_dispatch`;
// - a job that calls a reusable workflow (`jobs.<id>.uses`), whose steps this script cannot read;
// - in a workflow, in any other YAML file under .forgejo/, or in an action.yml or action.yaml
//   anywhere: a file the `yaml` package reads with an error or a warning (a duplicate key, an
//   unknown tag), a tag (`!!binary`, whose value YAML decodes), an alias (`*name`,
//   `<<: *name`), an `if` key, a `${{ }}` expression in a key or a value as YAML reads it
//   (escapes such as \x24 included), and a step that uses actions/github-script, whose code gets
//   the event;
// - in any file outside Markdown, a name made of GITHUB, FORGEJO or FORGE and
//   an underscore, which a script could read the event through, and the names of the actions
//   toolkit's github module and its event property. Neither this script nor its test holds one,
//   so both are read. It drops the caller's GIT_*_PATHSPECS variables, which would change the
//   files git reads;
// - a file name that is not UTF-8, or that the tree holds twice, which this script cannot read.
//
// It allows the one difference this repo's CI keeps on purpose: `branches: [main]` under
// `pull_request` limits the PR runs to PRs into main, the ones whose merge starts a push run on
// main.
//
// It cannot see code that branches on commit metadata (the push run checks out `main` at the
// merge commit, whose subject, SHA and parents differ from the pushed SHA's), code that the
// runner or its image runs in every step, or code that reads the event by a route the list
// above leaves out. Such code passes.
//
// Exit 0: no difference, so the push run repeats the PR run. Exit 1: it printed a difference, so
// wait on main's run. Exit 2: git failed, the SHA is unknown or Bun cannot load the `yaml`
// devDependency, as from a node_modules installed before it was added (where Bun finds no
// node_modules at all, it fetches the package itself); wait too.
// scripts/check-push-repeats-pr.test.ts holds one case per difference.
import type { LineCounter, Node } from 'yaml';

const RUNNER_NAMES = ['GITHUB', 'FORGEJO', 'FORGE'].map((name) => `${name}_`);
// Built from parts, like RUNNER_NAMES, so this file does not match itself.
const EVENT_READS = [['@actions', 'github'].join('/'), ['event', 'Name'].join('')];
const ALLOWED_TRIGGERS = new Set(['push', 'pull_request', 'schedule', 'workflow_dispatch']);
const EXPRESSION = /\$\{\{[\s\S]*?\}\}/g;

function fail(message: string): never {
	console.error(`check-push-repeats-pr: ${message}`);
	process.exit(2);
}

const args = process.argv.slice(2);
if (args.length !== 1) fail('usage: bun scripts/check-push-repeats-pr.ts <pushed SHA>');

const YAML = await import('yaml').catch(() =>
	fail('cannot load the yaml package; run bun install first')
);

// The caller's pathspec settings: GIT_ICASE_PATHSPECS=1 would make `:!*.md` skip a.MD as well.
const GIT_ENV = Object.fromEntries(
	Object.entries(process.env).filter(
		([name]) => !/^GIT_(LITERAL|GLOB|NOGLOB|ICASE)_PATHSPECS$/.test(name)
	)
);
let cwd = process.cwd();
function gitBytes(gitArgs: string[], okCodes = [0]): Buffer {
	const proc = Bun.spawnSync(['git', ...gitArgs], { cwd, env: GIT_ENV });
	if (!okCodes.includes(proc.exitCode)) {
		fail(`git ${gitArgs.join(' ')} failed: ${proc.stderr.toString().trim()}`);
	}
	return proc.stdout;
}
const git = (gitArgs: string[], okCodes = [0]) => gitBytes(gitArgs, okCodes).toString();

cwd = git(['rev-parse', '--show-toplevel']).trim();
const commit = git(['rev-parse', '--verify', '--quiet', `${args[0]}^{commit}`], [0, 1]).trim();
if (!commit) fail(`unknown commit: ${args[0]}`);
const differences: string[] = [];
const tree = gitBytes(['ls-tree', '-r', '--name-only', '-z', commit]);
let names: string;
try {
	names = new TextDecoder('utf-8', { fatal: true }).decode(tree);
} catch {
	// Decoded with U+FFFD, two names can read as one, and `git show` then reads the wrong file.
	differences.push(`${commit}: a file name that is not UTF-8, which this script cannot read`);
	names = tree.toString('utf8');
}
const files = names.split('\0').filter(Boolean);
// A tree git fsck rejects (duplicateEntries) can hold two files of one name; `git show` reads
// one of them, and a checkout may take the other.
if (new Set(files).size !== files.length) {
	differences.push(`${commit}: a file name the tree holds twice, which this script cannot read`);
}
const isYaml = (f: string) => /\.ya?ml$/.test(f);
const workflows = files.filter((f) => f.startsWith('.forgejo/workflows/') && isYaml(f));
const scanned = files.filter(
	(f) => (f.startsWith('.forgejo/') && isYaml(f)) || /(^|\/)action\.ya?ml$/.test(f)
);
if (!workflows.length) differences.push('.forgejo/workflows/: no workflow file');

const isEmpty = (value: unknown) =>
	value == null || (typeof value === 'object' && Object.keys(value).length === 0);

function isMainOnly(value: unknown): boolean {
	if (isEmpty(value)) return true;
	if (typeof value !== 'object' || value === null) return false;
	const filter = value as Record<string, unknown>;
	const branches = [filter.branches].flat();
	return (
		Object.keys(filter).join() === 'branches' && branches.length === 1 && branches[0] === 'main'
	);
}

function checkTriggers(file: string, doc: unknown) {
	const on = (doc as { on?: unknown } | null)?.on;
	let triggers: Record<string, unknown>;
	if (typeof on === 'string') triggers = { [on]: null };
	else if (Array.isArray(on)) triggers = Object.fromEntries(on.map((t) => [t, null]));
	else if (on && typeof on === 'object') triggers = on as Record<string, unknown>;
	else return differences.push(`${file}: no on: triggers`);
	for (const name of ['push', 'pull_request']) {
		if (!(name in triggers)) differences.push(`${file}: no ${name} trigger`);
		else if (!isMainOnly(triggers[name])) {
			differences.push(`${file}: ${name} has a filter beyond branches: [main]`);
		}
	}
	for (const name of Object.keys(triggers)) {
		if (!ALLOWED_TRIGGERS.has(name)) differences.push(`${file}: trigger ${name}`);
	}
}

function checkJobs(file: string, doc: unknown) {
	const jobs = (doc as { jobs?: unknown } | null)?.jobs;
	if (!jobs || typeof jobs !== 'object') return;
	for (const [id, job] of Object.entries(jobs)) {
		if (job && typeof job === 'object' && 'uses' in job) {
			differences.push(`${file}: job ${id} calls a reusable workflow: ${job.uses}`);
		}
	}
}

// Every node of the file, keys included, so a key spelled "if" or `if :` and an expression in a
// key are found too.
function walk(file: string, lines: LineCounter, node: unknown, where: string) {
	const at = (n: unknown) => {
		const start = (n as Node | null)?.range?.[0];
		return start === undefined ? file : `${file}:${lines.linePos(start).line}`;
	};
	const tag = (node as { tag?: string } | null)?.tag;
	if (tag)
		differences.push(`${at(node)}: ${where}: a tag (${tag}), which this script does not read`);
	if (YAML.isAlias(node)) {
		differences.push(
			`${at(node)}: ${where}: an alias (*${node.source}), which this script does not follow`
		);
	} else if (YAML.isScalar(node)) {
		if (typeof node.value !== 'string') return;
		for (const match of node.value.matchAll(EXPRESSION)) {
			differences.push(`${at(node)}: ${where}: an expression: ${match[0]}`);
		}
	} else if (YAML.isSeq(node)) {
		node.items.forEach((item, i) => walk(file, lines, item, `${where}[${i}]`));
	} else if (YAML.isMap(node)) {
		for (const pair of node.items) {
			const key = YAML.isScalar(pair.key) ? String(pair.key.value) : '?';
			const path = `${where}.${key}`;
			const value = YAML.isScalar(pair.value) ? String(pair.value.value) : '(not a plain value)';
			walk(file, lines, pair.key, `${path} (key)`);
			if (key === 'if') differences.push(`${at(pair.key)}: ${path}: an if: ${value}`);
			if (key === 'uses' && value.includes('github-script')) {
				differences.push(`${at(pair.key)}: ${path}: runs code that gets the event: ${value}`);
			}
			walk(file, lines, pair.value, path);
		}
	}
}

for (const file of scanned) {
	const lines = new YAML.LineCounter();
	const doc = YAML.parseDocument(git(['show', `${commit}:${file}`]), { lineCounter: lines });
	const problem = doc.errors[0] ?? doc.warnings[0];
	if (problem) {
		differences.push(`${file}: not readable as YAML (${problem.message.split('\n')[0]})`);
		continue;
	}
	walk(file, lines, doc.contents, '');
	if (workflows.includes(file)) {
		const value: unknown = doc.toJS();
		checkTriggers(file, value);
		checkJobs(file, value);
	}
}

const pattern = [...RUNNER_NAMES, ...EVENT_READS].join('|');
const hits = git(['grep', '-nE', pattern, commit, '--', '.', ':!*.md'], [0, 1]);
for (const hit of hits.split('\n').filter(Boolean)) {
	differences.push(`${hit.replace(`${commit}:`, '')}: reads the event or names a runner variable`);
}

const short = commit.slice(0, 8);
if (differences.length) {
	for (const d of differences) console.log(d);
	console.log(
		`check-push-repeats-pr: ${short}: ${differences.length} difference(s); wait on main's run`
	);
	process.exit(1);
}
console.log(
	`check-push-repeats-pr: ${short}: the push run repeats the PR run ` +
		`(${workflows.length} workflow file(s), ${scanned.length} file(s) scanned)`
);
