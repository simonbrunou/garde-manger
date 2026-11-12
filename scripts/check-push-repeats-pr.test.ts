// scripts/check-push-repeats-pr.ts (#105) against a small git repo written per test. The base
// repo holds the shapes the script must pass, as this repo's CI has them: a workflow on `push`
// and `pull_request` to `main`, the graphify-out guard with its PR-only `if` and
// `${{ github.base_ref }}`, and a runner variable name in Markdown. Each other case edits one
// file into one difference and asserts exit 1 and the line that names it, so removing any rule
// from the script turns a case red. The runner variable names are built from parts here, as in
// the script, so neither file holds one and the script reads both.
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const SCRIPT = join(import.meta.dir, 'check-push-repeats-pr.ts');
const CI = '.forgejo/workflows/ci.yml';
const [GH, FJ, FG] = ['GITHUB', 'FORGEJO', 'FORGE'].map((name) => `${name}_`);
const LIB = ['@actions', 'github'].join('/');
const EV = ['event', 'Name'].join('');

// The repos below must not see the caller's git config or a GIT_DIR a hook set.
const ENV: Record<string, string> = {
	...Object.fromEntries(
		Object.entries(process.env).filter(
			(e): e is [string, string] => !e[0].startsWith('GIT_') && e[1] !== undefined
		)
	),
	GIT_CONFIG_GLOBAL: '/dev/null',
	GIT_CONFIG_NOSYSTEM: '1',
	LC_ALL: 'C'
};

// Each test runs git a few times and the script once. On the shared CI runner a test can take
// longer than Bun's default 5 s; 30 s still fails a genuine hang.
const TIMEOUT_MS = 30_000;

let root: string;
beforeAll(() => {
	root = mkdtempSync(join(tmpdir(), 'gm-push-repeats-pr-'));
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

const GUARD = [
	'      - name: graphify-out guard',
	"        if: github.event_name == 'pull_request'",
	'        env:',
	'          GRAPHIFY_GUARD_BASE: origin/${{ github.base_ref }}',
	'        run: sh scripts/check-graphify-out.sh'
].join('\n');
const baseCi = [
	'name: CI',
	'on:',
	'  push:',
	'    branches: [main]',
	'  pull_request:',
	'    branches: [main]',
	'jobs:',
	'  verify:',
	'    runs-on: ubuntu-latest',
	'    steps:',
	'      - uses: actions/checkout@v7',
	'        with:',
	'          fetch-depth: 0',
	GUARD,
	'      - run: bun test'
].join('\n');
const base: Record<string, string> = {
	[CI]: baseCi,
	'README.md': `CI reads ${GH}TOKEN; Markdown is not run.\n`,
	'scripts/build.sh': 'echo build\n'
};

type Git = (args: string[], input?: string) => string;
type Options = {
	script?: string;
	subdir?: string;
	bunArgs?: string[];
	// Set for the script only, not for the git calls that build the repo.
	env?: Record<string, string>;
	// Writes a commit that the working tree cannot hold and returns its SHA.
	rewrite?: (git: Git, dir: string) => string;
};

const AUTHOR = ['-c', 'user.name=t', '-c', 'user.email=t@example.invalid'];
let count = 0;
// Commits `files` over the base repo (a null value deletes a base file) and runs `script` on
// that commit from `subdir` of the repo.
function check(
	files: Record<string, string | null> = {},
	{ script = SCRIPT, subdir = '', bunArgs = [], env = {}, rewrite }: Options = {}
) {
	const dir = join(root, String(count++));
	for (const [file, content] of Object.entries({ ...base, ...files })) {
		if (content === null) continue;
		mkdirSync(dirname(join(dir, file)), { recursive: true });
		writeFileSync(join(dir, file), content);
	}
	const git: Git = (args, input) => {
		const stdin = input === undefined ? undefined : Buffer.from(input);
		const proc = Bun.spawnSync(['git', ...args], { cwd: dir, env: ENV, stdin });
		if (proc.exitCode !== 0) throw new Error(`git ${args.join(' ')}: ${proc.stderr.toString()}`);
		return proc.stdout.toString();
	};
	git(['init', '-q', '-b', 'main']);
	git(['add', '-A']);
	git([...AUTHOR, 'commit', '-qm', 'c']);
	const sha = rewrite ? rewrite(git, dir) : git(['rev-parse', 'HEAD']).trim();
	const proc = Bun.spawnSync([process.execPath, ...bunArgs, script, sha], {
		cwd: join(dir, subdir),
		env: { ...ENV, ...env }
	});
	return { exitCode: proc.exitCode, out: proc.stdout.toString() + proc.stderr.toString() };
}

// Replaces `from` in `text`, failing the test when `from` is not there, so a case never runs on
// the unedited base by mistake.
function edit(text: string, from: string | RegExp, to: string) {
	const out = text.replace(from, to);
	expect(out).not.toBe(text);
	return out;
}

function ciWith(...extraSteps: string[]) {
	return `${baseCi}\n${extraSteps.join('\n')}\n`;
}

function expectPass(files: Record<string, string | null>, options?: Options) {
	const { exitCode, out } = check(files, options);
	expect(out).toMatch(/the push run repeats the PR run/);
	expect(exitCode).toBe(0);
}

function expectDifference(
	files: Record<string, string | null>,
	pattern: RegExp,
	options?: Options
) {
	const { exitCode, out } = check(files, options);
	expect(out).toMatch(pattern);
	expect(out).toMatch(/wait on main's run/);
	expect(exitCode).toBe(1);
}

describe('check-push-repeats-pr passes', () => {
	it(
		"the base repo: this repo's triggers and graphify-out guard",
		() => {
			const { exitCode, out } = check();
			expect(out).toMatch(
				/the push run repeats the PR run but for 1 PR-only graphify-out guard step\(s\) \(1 workflow file\(s\), 1 file\(s\) scanned\)/
			);
			expect(exitCode).toBe(0);
		},
		TIMEOUT_MS
	);
	it(
		'triggers written as a list',
		() => {
			const ci = edit(
				baseCi,
				/on:\n {2}push:\n {4}branches: \[main\]\n {2}pull_request:\n {4}branches: \[main\]/,
				'on: [push, pull_request]'
			);
			expectPass({ [CI]: ci });
		},
		TIMEOUT_MS
	);
	it(
		'push and pull_request with no filter, and workflow_dispatch and schedule beside them',
		() => {
			const ci = edit(
				baseCi,
				'  push:\n    branches: [main]\n  pull_request:\n    branches: [main]\n',
				"  push:\n  pull_request:\n  workflow_dispatch:\n  schedule:\n    - cron: '0 3 * * *'\n"
			);
			expectPass({ [CI]: ci });
		},
		TIMEOUT_MS
	);
	it(
		'branches written as a string under both triggers',
		() => {
			expectPass({ [CI]: baseCi.replaceAll('branches: [main]', 'branches: main') });
		},
		TIMEOUT_MS
	);
	it(
		'an action from data.forgejo.org',
		() => {
			expectPass({ [CI]: ciWith('      - uses: https://data.forgejo.org/actions/setup-node@v7') });
		},
		TIMEOUT_MS
	);
	it(
		'a runner variable name in graphify-out',
		() => {
			expectPass({ 'graphify-out/graph.json': `{"label": "${GH}REF"}\n` });
		},
		TIMEOUT_MS
	);
	it(
		'run from a subfolder of the repo',
		() => {
			expectPass({}, { subdir: 'scripts' });
		},
		TIMEOUT_MS
	);
	it(
		"Markdown anywhere, whatever pathspec variables the caller's environment sets",
		() => {
			const docs = { 'docs/notes.md': `Steps read ${GH}REF.\n` };
			for (const name of ['LITERAL', 'GLOB', 'NOGLOB', 'ICASE']) {
				expectPass(docs, { env: { [`GIT_${name}_PATHSPECS`]: '1' } });
			}
		},
		TIMEOUT_MS
	);
});

describe('check-push-repeats-pr finds a difference', () => {
	it(
		'a workflow that runs only on push',
		() => {
			expectDifference(
				{ '.forgejo/workflows/deploy.yml': 'on: push\njobs: {}\n' },
				/deploy\.yml: no pull_request trigger/
			);
		},
		TIMEOUT_MS
	);
	it(
		'a push-only workflow in a subfolder of .forgejo/workflows',
		() => {
			expectDifference(
				{ '.forgejo/workflows/sub/deploy.yaml': 'on: push\njobs: {}\n' },
				/sub\/deploy\.yaml: no pull_request trigger/
			);
		},
		TIMEOUT_MS
	);
	it(
		'a push-only workflow, run from a subfolder of the repo',
		() => {
			expectDifference(
				{ '.forgejo/workflows/deploy.yml': 'on: push\njobs: {}\n' },
				/deploy\.yml: no pull_request trigger/,
				{ subdir: 'scripts' }
			);
		},
		TIMEOUT_MS
	);
	it(
		'a workflow that runs only on pull_request',
		() => {
			expectDifference(
				{ '.forgejo/workflows/lint.yml': 'on:\n  pull_request:\njobs: {}\n' },
				/lint\.yml: no push trigger/
			);
		},
		TIMEOUT_MS
	);
	it(
		'a trigger other than push, pull_request, schedule and workflow_dispatch',
		() => {
			const ci = edit(baseCi, 'jobs:', '  workflow_run:\n    workflows: [Build]\njobs:');
			expectDifference({ [CI]: ci }, /ci\.yml: trigger workflow_run/);
		},
		TIMEOUT_MS
	);
	it(
		'a pull_request filter beyond branches: [main]',
		() => {
			const ci = edit(baseCi, '    branches: [main]\njobs:', "    paths: ['src/**']\njobs:");
			expectDifference(
				{ [CI]: ci },
				/ci\.yml: pull_request has a filter beyond branches: \[main\]/
			);
		},
		TIMEOUT_MS
	);
	it(
		'a pull_request types filter beside branches: [main]',
		() => {
			const ci = edit(
				baseCi,
				'    branches: [main]\njobs:',
				'    branches: [main]\n    types: [opened]\njobs:'
			);
			expectDifference(
				{ [CI]: ci },
				/ci\.yml: pull_request has a filter beyond branches: \[main\]/
			);
		},
		TIMEOUT_MS
	);
	it(
		'pull_request into main and another branch',
		() => {
			const ci = edit(baseCi, '    branches: [main]\njobs:', '    branches: [main, dev]\njobs:');
			expectDifference(
				{ [CI]: ci },
				/ci\.yml: pull_request has a filter beyond branches: \[main\]/
			);
		},
		TIMEOUT_MS
	);
	it(
		'a push filter beyond branches: [main]',
		() => {
			const ci = edit(
				baseCi,
				'    branches: [main]\n  pull_request:',
				"    branches: [main]\n    paths-ignore: ['**.md']\n  pull_request:"
			);
			expectDifference({ [CI]: ci }, /ci\.yml: push has a filter beyond branches: \[main\]/);
		},
		TIMEOUT_MS
	);
	it(
		'push on main and another branch',
		() => {
			const ci = edit(
				baseCi,
				'    branches: [main]\n  pull_request:',
				'    branches: [main, dev]\n  pull_request:'
			);
			expectDifference({ [CI]: ci }, /ci\.yml: push has a filter beyond branches: \[main\]/);
		},
		TIMEOUT_MS
	);
	it(
		'push on another branch only',
		() => {
			const ci = edit(
				baseCi,
				'    branches: [main]\n  pull_request:',
				'    branches: dev\n  pull_request:'
			);
			expectDifference({ [CI]: ci }, /ci\.yml: push has a filter beyond branches: \[main\]/);
		},
		TIMEOUT_MS
	);
	it(
		'a workflow with no on:',
		() => {
			expectDifference(
				{ '.forgejo/workflows/empty.yml': 'jobs: {}\n' },
				/empty\.yml: no on: triggers/
			);
		},
		TIMEOUT_MS
	);
	it(
		'a workflow that is not YAML',
		() => {
			expectDifference(
				{ '.forgejo/workflows/broken.yml': 'on: [push\n' },
				/broken\.yml: not readable as YAML/
			);
		},
		TIMEOUT_MS
	);
	it(
		'a duplicate key, which would hide the first if:',
		() => {
			const ci = ciWith(
				'      - run: echo push',
				'        if: github.ref',
				'        if: github.ref'
			);
			expectDifference({ [CI]: ci }, /ci\.yml: not readable as YAML \(Map keys must be unique/);
		},
		TIMEOUT_MS
	);
	it(
		'an unknown tag, which YAML reads with a warning',
		() => {
			const ci = ciWith('      - run: !event echo hi');
			expectDifference({ [CI]: ci }, /ci\.yml: not readable as YAML \(Unresolved tag: !event/);
		},
		TIMEOUT_MS
	);
	it(
		'a !!binary value, which YAML decodes into an expression',
		() => {
			const encoded = Buffer.from('echo ${{ github.event_name }}').toString('base64');
			const ci = ciWith(`      - run: !!binary ${encoded}`);
			expectDifference(
				{ [CI]: ci },
				/ci\.yml:20: \.jobs\.verify\.steps\[3\]\.run: a tag \(tag:yaml\.org,2002:binary\)/
			);
		},
		TIMEOUT_MS
	);
	it(
		'no workflow at all',
		() => {
			expectDifference({ [CI]: null }, /\.forgejo\/workflows\/: no workflow file/);
		},
		TIMEOUT_MS
	);
	it(
		'an if: on github.event_name',
		() => {
			const ci = ciWith('      - run: echo push', "        if: github.event_name == 'push'");
			expectDifference(
				{ [CI]: ci },
				/ci\.yml:21: \.jobs\.verify\.steps\[3\]\.if: an if: github\.event_name == 'push'/
			);
		},
		TIMEOUT_MS
	);
	it(
		'an if: that reads no event',
		() => {
			const ci = ciWith(
				'      - run: bun install',
				"        if: steps.cache.outputs.cache-hit != 'true'"
			);
			expectDifference({ [CI]: ci }, /steps\[3\]\.if: an if: steps\.cache/);
		},
		TIMEOUT_MS
	);
	it(
		'an if: always()',
		() => {
			expectDifference(
				{ [CI]: ciWith('      - run: echo done', '        if: always()') },
				/steps\[3\]\.if: an if: always\(\)/
			);
		},
		TIMEOUT_MS
	);
	it(
		'an if key written in quotes',
		() => {
			const ci = ciWith(
				'      - run: echo push',
				'        "if": steps.co.outputs.ref == \'refs/heads/main\''
			);
			expectDifference({ [CI]: ci }, /steps\[3\]\.if: an if:/);
		},
		TIMEOUT_MS
	);
	it(
		'an if key with a space before its colon',
		() => {
			const ci = ciWith(
				'      - run: echo push',
				"        if : steps.co.outputs.ref == 'refs/heads/main'"
			);
			expectDifference({ [CI]: ci }, /steps\[3\]\.if: an if:/);
		},
		TIMEOUT_MS
	);
	it(
		'an if: that is an alias',
		() => {
			const ci = ciWith(
				'      - run: echo a',
				'        env: { C: &cond "github.event_name == \'push\'" }',
				'      - run: echo b',
				'        if: *cond'
			);
			expectDifference(
				{ [CI]: ci },
				/ci\.yml:23: \.jobs\.verify\.steps\[4\]\.if: an alias \(\*cond\)/
			);
		},
		TIMEOUT_MS
	);
	it(
		'a merge key that pulls in an alias',
		() => {
			const ci = ciWith('      - &step { run: echo a }', '      - <<: *step', '        name: b');
			expectDifference({ [CI]: ci }, /steps\[4\]\.<<: an alias \(\*step\)/);
		},
		TIMEOUT_MS
	);
	it(
		'github.ref in an env',
		() => {
			const ci = ciWith(
				'      - run: echo ref',
				'        env:',
				'          REF: ${{ github.ref }}'
			);
			expectDifference(
				{ [CI]: ci },
				/ci\.yml:22: \.jobs\.verify\.steps\[3\]\.env\.REF: an expression: \$\{\{ github\.ref \}\}/
			);
		},
		TIMEOUT_MS
	);
	it(
		"the index form github['event_name']",
		() => {
			expectDifference(
				{ [CI]: ciWith("      - run: echo ${{ github['event_name'] }}") },
				/ci\.yml:20: .*an expression/
			);
		},
		TIMEOUT_MS
	);
	it(
		'an expression on a step output that follows the event',
		() => {
			const ci = ciWith(
				'      - run: bun run e2e',
				"        continue-on-error: ${{ steps.co.outputs.ref != 'refs/heads/main' }}"
			);
			expectDifference({ [CI]: ci }, /ci\.yml:21: .*continue-on-error: an expression/);
		},
		TIMEOUT_MS
	);
	it(
		'the forgejo and forge aliases',
		() => {
			const ci = ciWith(
				'      - run: echo ${{ forgejo.event_name }}',
				'      - run: echo ${{ forge.ref }}'
			);
			expectDifference(
				{ [CI]: ci },
				/ci\.yml:20: .*an expression[\s\S]*ci\.yml:21: .*an expression/
			);
		},
		TIMEOUT_MS
	);
	it(
		'an expression split over lines',
		() => {
			const ci = ciWith('      - run: >-', '          echo ${{', '          github.event_name }}');
			expectDifference({ [CI]: ci }, /ci\.yml:20: .*an expression: \$\{\{ github\.event_name \}\}/);
		},
		TIMEOUT_MS
	);
	it(
		'an expression spelled with a YAML escape',
		() => {
			const ci = ciWith('      - run: "echo \\x24{{ github.event_name }}"');
			expectDifference({ [CI]: ci }, /ci\.yml:20: .*an expression: \$\{\{ github\.event_name \}\}/);
		},
		TIMEOUT_MS
	);
	it(
		'an expression in a key',
		() => {
			const ci = ciWith('      - run: echo key', '        env:', '          ${{ github.ref }}: x');
			expectDifference({ [CI]: ci }, /\(key\): an expression: \$\{\{ github\.ref \}\}/);
		},
		TIMEOUT_MS
	);
	it(
		"the guard's if: on a step that runs something else",
		() => {
			const ci = ciWith(
				'      - run: bun run build',
				"        if: github.event_name == 'pull_request'"
			);
			expectDifference({ [CI]: ci }, /steps\[3\]\.if: an if: github\.event_name == 'pull_request'/);
		},
		TIMEOUT_MS
	);
	it(
		'the guard script under another if:',
		() => {
			const ci = edit(
				baseCi,
				"if: github.event_name == 'pull_request'",
				"if: github.event_name != 'push'"
			);
			expectDifference(
				{ [CI]: ci },
				/steps\[1\]\.if: an if: github\.event_name != 'push'[\s\S]*GRAPHIFY_GUARD_BASE: an expression: \$\{\{ github\.base_ref \}\}/
			);
		},
		TIMEOUT_MS
	);
	it(
		'a guard step with a shell, which runs other code on the PR run',
		() => {
			const ci = edit(
				baseCi,
				'        run: sh scripts/check-graphify-out.sh',
				"        shell: bash -c 'echo pr > marker; sh {0}'\n        run: sh scripts/check-graphify-out.sh"
			);
			expectDifference(
				{ [CI]: ci },
				/steps\[1\]\.if: an if: github\.event_name == 'pull_request'[\s\S]*GRAPHIFY_GUARD_BASE: an expression/
			);
		},
		TIMEOUT_MS
	);
	it(
		'a guard step with another env variable, which the shell can run code from',
		() => {
			const ci = edit(
				baseCi,
				'          GRAPHIFY_GUARD_BASE',
				'          BASH_ENV: scripts/pr-only.sh\n          GRAPHIFY_GUARD_BASE'
			);
			expectDifference({ [CI]: ci }, /steps\[1\]\.if: an if: github\.event_name == 'pull_request'/);
		},
		TIMEOUT_MS
	);
	for (const [where, from, to] of [
		[
			'the workflow',
			'jobs:',
			'defaults:\n  run:\n    shell: bash -c "sh {0}; touch marker"\njobs:'
		],
		[
			'the job',
			'    runs-on:',
			'    defaults:\n      run:\n        working-directory: sub\n    runs-on:'
		],
		['the workflow', 'jobs:', 'env:\n  BASH_ENV: scripts/hook.sh\njobs:'],
		['the job', '    runs-on:', '    env:\n      BASH_ENV: scripts/hook.sh\n    runs-on:'],
		[
			'the job',
			'    runs-on:',
			'    container:\n      image: node:22\n      env:\n        BASH_ENV: scripts/hook.sh\n    runs-on:'
		],
		// Keys no step inherits: the guard's workflow and job allow only the keys this repo uses.
		[
			'the job',
			'    runs-on:',
			'    services:\n      db:\n        image: postgres:17\n    runs-on:'
		],
		['the workflow', 'jobs:', 'concurrency: ci\njobs:']
	]) {
		const key = to.trim().split(':')[0];
		it(
			`${key} on ${where} of the guard`,
			() => {
				expectDifference(
					{ [CI]: edit(baseCi, from, to) },
					/steps\[1\]\.if: an if: github\.event_name == 'pull_request'/
				);
			},
			TIMEOUT_MS
		);
	}
	it(
		'github.base_ref outside the guard',
		() => {
			const ci = ciWith(
				'      - run: echo base',
				'        env:',
				'          BASE: ${{ github.base_ref }}'
			);
			expectDifference(
				{ [CI]: ci },
				/steps\[3\]\.env\.BASE: an expression: \$\{\{ github\.base_ref \}\}/
			);
		},
		TIMEOUT_MS
	);
	it(
		'another expression inside the guard',
		() => {
			const ci = edit(baseCi, 'name: graphify-out guard', 'name: guard ${{ github.ref }}');
			expectDifference({ [CI]: ci }, /steps\[1\]\.name: an expression: \$\{\{ github\.ref \}\}/);
		},
		TIMEOUT_MS
	);
	it(
		'an if: in a local action under .forgejo',
		() => {
			const action =
				"runs:\n  using: composite\n  steps:\n    - run: echo x\n      if: env.X == '1'\n";
			expectDifference(
				{ '.forgejo/actions/setup/action.yml': action },
				/\.forgejo\/actions\/setup\/action\.yml:5: \.runs\.steps\[0\]\.if: an if:/
			);
		},
		TIMEOUT_MS
	);
	it(
		'an expression in another YAML file under .forgejo',
		() => {
			expectDifference(
				{ '.forgejo/shared/env.yml': 'REF: ${{ github.ref }}\n' },
				/\.forgejo\/shared\/env\.yml:1: \.REF: an expression/
			);
		},
		TIMEOUT_MS
	);
	it(
		'an expression in an action.yaml outside .forgejo',
		() => {
			const action =
				'runs:\n  using: composite\n  steps:\n    - run: echo ${{ github.event_name }}\n';
			expectDifference(
				{ 'actions/setup/action.yaml': action },
				/actions\/setup\/action\.yaml:4: .*an expression/
			);
		},
		TIMEOUT_MS
	);
	it(
		'an if: in an action.yml outside .forgejo',
		() => {
			const action =
				"runs:\n  using: composite\n  steps:\n    - run: echo x\n      if: env.X == '1'\n";
			expectDifference(
				{ 'actions/build/action.yml': action },
				/actions\/build\/action\.yml:5: \.runs\.steps\[0\]\.if: an if:/
			);
		},
		TIMEOUT_MS
	);
	it(
		'a script that reads the ref from the runner',
		() => {
			expectDifference(
				{ 'scripts/build.sh': `echo build\necho "$${GH}REF"\n` },
				/scripts\/build\.sh:2:.*names a runner variable/
			);
		},
		TIMEOUT_MS
	);
	it(
		'a .MD file that reads the ref, when the caller sets GIT_ICASE_PATHSPECS',
		() => {
			expectDifference(
				{ 'scripts/hook.MD': `echo "$${GH}REF"\n` },
				/scripts\/hook\.MD:1:.*names a runner variable/,
				{ env: { GIT_ICASE_PATHSPECS: '1' } }
			);
		},
		TIMEOUT_MS
	);
	it(
		'two files of one name, the second with an if:',
		() => {
			// Git refuses such a tree from the working tree (fsck: duplicateEntries), so build it by hand.
			const rewrite = (git: Git) => {
				const second = ciWith('      - run: echo push', "        if: github.event_name == 'push'");
				const blob = git(['hash-object', '-w', '--stdin'], second).trim();
				const entries = `${git(['ls-tree', 'HEAD:.forgejo/workflows'])}100644 blob ${blob}\tci.yml\n`;
				const workflows = git(['mktree'], entries).trim();
				const forgejo = git(['mktree'], `040000 tree ${workflows}\tworkflows\n`).trim();
				const top = git(['ls-tree', 'HEAD']).replace(/^.*\t\.forgejo\n/m, '');
				const tree = git(['mktree'], `${top}040000 tree ${forgejo}\t.forgejo\n`).trim();
				expect(git(['ls-tree', '-r', '--name-only', tree])).toMatch(/ci\.yml\n.*ci\.yml\n/);
				return git([...AUTHOR, 'commit-tree', tree, '-p', 'HEAD', '-m', 'dup']).trim();
			};
			expectDifference({}, /: a file name the tree holds twice, which this script cannot read/, {
				rewrite
			});
		},
		TIMEOUT_MS
	);
	it(
		'a workflow whose name is not UTF-8, with an if:, next to its U+FFFD twin',
		() => {
			const rewrite = (git: Git, dir: string) => {
				const at = (bytes: number[]) =>
					Buffer.concat([Buffer.from(join(dir, '.forgejo/workflows/a')), Buffer.from(bytes)]);
				const ifStep = ciWith('      - run: echo push', "        if: github.event_name == 'push'");
				writeFileSync(at([0xff, 0x2e, 0x79, 0x6d, 0x6c]), ifStep);
				writeFileSync(at([0xef, 0xbf, 0xbd, 0x2e, 0x79, 0x6d, 0x6c]), baseCi);
				git(['add', '-A']);
				git([...AUTHOR, 'commit', '-qm', 'latin-1 name']);
				return git(['rev-parse', 'HEAD']).trim();
			};
			expectDifference({}, /: a file name that is not UTF-8, which this script cannot read/, {
				rewrite
			});
		},
		TIMEOUT_MS
	);
	it(
		'a test that reads the event from the runner',
		() => {
			expectDifference(
				{ 'src/e2e.test.ts': `if (process.env.${GH}EVENT_NAME === 'push') run();\n` },
				/src\/e2e\.test\.ts:1:.*names a runner variable/
			);
		},
		TIMEOUT_MS
	);
	it(
		'a module that reads the forgejo and forge variable names',
		() => {
			const env = `export const ref = process.env.${FJ}REF;\nexport const e = process.env.${FG}EVENT_NAME;\n`;
			expectDifference(
				{ 'src/env.ts': env },
				/src\/env\.ts:1:.*names a runner variable[\s\S]*src\/env\.ts:2:.*names a runner variable/
			);
		},
		TIMEOUT_MS
	);
	it(
		'a binary file that holds a runner variable name',
		() => {
			expectDifference(
				{ 'bin/tool': `\0\x01${GH}REF\0` },
				/bin\/tool matches: reads the event or names a runner variable/
			);
		},
		TIMEOUT_MS
	);
	it(
		"a script under .forgejo that loads the actions toolkit's github module",
		() => {
			expectDifference(
				{ '.forgejo/scripts/gate.js': `const { context } = require('${LIB}');\n` },
				/\.forgejo\/scripts\/gate\.js:1:.*reads the event/
			);
		},
		TIMEOUT_MS
	);
	it(
		"a module that reads the toolkit context's event property",
		() => {
			expectDifference(
				{ 'src/gate.ts': `export const onPush = (c: { ${EV}: string }) => c.${EV} === 'push';\n` },
				/src\/gate\.ts:1:.*reads the event/
			);
		},
		TIMEOUT_MS
	);
	it(
		'a step that uses actions/github-script',
		() => {
			const ci = ciWith(
				'      - uses: actions/github-script@v7',
				'        with:',
				"          script: core.info('hi')"
			);
			expectDifference(
				{ [CI]: ci },
				/ci\.yml:20: \.jobs\.verify\.steps\[3\]\.uses: runs code that gets the event: actions\/github-script@v7/
			);
		},
		TIMEOUT_MS
	);
	it(
		'a job that calls a reusable workflow',
		() => {
			const ci = `${baseCi}\n  deploy:\n    uses: owner/repo/.forgejo/workflows/deploy.yml@main\n`;
			expectDifference(
				{ [CI]: ci },
				/ci\.yml: job deploy calls a reusable workflow: owner\/repo\/\.forgejo\/workflows\/deploy\.yml@main/
			);
		},
		TIMEOUT_MS
	);
});

it('the script and this test hold none of the names they search for, so the script reads both', () => {
	const names = new RegExp([GH, FJ, FG, LIB, EV].join('|'));
	for (const file of [SCRIPT, import.meta.path]) {
		expect(readFileSync(file, 'utf8')).not.toMatch(names);
	}
});

describe('check-push-repeats-pr exits 2', () => {
	it(
		'on a SHA the repo lacks',
		() => {
			const dir = join(root, 'nosha');
			mkdirSync(dir);
			Bun.spawnSync(['git', 'init', '-q', '-b', 'main'], { cwd: dir, env: ENV });
			const proc = Bun.spawnSync(
				[process.execPath, SCRIPT, '0123456789abcdef0123456789abcdef01234567'],
				{ cwd: dir, env: ENV }
			);
			expect(proc.stderr.toString()).toMatch(/unknown commit/);
			expect(proc.exitCode).toBe(2);
		},
		TIMEOUT_MS
	);
	it(
		'when the yaml package is missing',
		() => {
			const copyDir = join(root, 'noyaml');
			mkdirSync(copyDir);
			const copy = join(copyDir, 'check.ts');
			copyFileSync(SCRIPT, copy);
			// --no-install stops Bun from fetching the package itself where no node_modules is found.
			const { exitCode, out } = check({}, { script: copy, bunArgs: ['--no-install'] });
			expect(out).toMatch(/cannot load the yaml package; run bun install first/);
			expect(exitCode).toBe(2);
		},
		TIMEOUT_MS
	);
});
