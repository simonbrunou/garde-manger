import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const SCRIPT = join(import.meta.dir, 'check-graphify-out.sh');

// The repos below must not see the caller's git config or a GIT_DIR a hook set.
const ENV: Record<string, string> = {
	...Object.fromEntries(
		Object.entries(process.env).filter(
			(e): e is [string, string] => !e[0].startsWith('GIT_') && e[1] !== undefined
		)
	),
	GIT_CONFIG_GLOBAL: '/dev/null',
	GIT_CONFIG_NOSYSTEM: '1'
};

let repo: string;
beforeEach(() => {
	repo = mkdtempSync(join(tmpdir(), 'gm-graphify-guard-'));
	git('init', '-q', '-b', 'main');
	write('src/app.ts', 'export {};\n');
	write('graphify-out/GRAPH_REPORT.md', '# graph\n');
	commit('base');
	git('update-ref', 'refs/remotes/origin/main', 'main');
	git('switch', '-q', '-c', 'pr');
});
afterEach(() => rmSync(repo, { recursive: true, force: true }));

function git(...args: string[]) {
	const proc = Bun.spawnSync(['git', ...args], { cwd: repo, env: ENV });
	if (proc.exitCode !== 0) throw new Error(`git ${args.join(' ')}: ${proc.stderr.toString()}`);
}

function write(path: string, body: string) {
	mkdirSync(dirname(join(repo, path)), { recursive: true });
	writeFileSync(join(repo, path), body);
}

function commit(message: string) {
	git('add', '-A');
	git('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '-m', message);
}

function guard(env: Record<string, string> = {}) {
	const proc = Bun.spawnSync(['sh', SCRIPT], { cwd: repo, env: { ...ENV, ...env } });
	return { exitCode: proc.exitCode, stdout: proc.stdout.toString() };
}

describe('check-graphify-out.sh', () => {
	it('passes a PR that changes code only', () => {
		write('src/app.ts', 'export const a = 1;\n');
		commit('code');
		const r = guard();
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain('0 graphify-out/ files and 1 other files changed');
	});

	it('passes a graph refresh PR that changes graphify-out/ only', () => {
		write('graphify-out/GRAPH_REPORT.md', '# graph v2\n');
		write('graphify-out/graph.json', '{}\n');
		commit('refresh');
		const r = guard();
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain('2 graphify-out/ files and 0 other files changed');
	});

	it('fails a PR that changes graphify-out/ and code, and names the graph files', () => {
		write('src/app.ts', 'export const a = 1;\n');
		commit('code');
		write('graphify-out/GRAPH_REPORT.md', '# graph v2\n');
		commit('hook output');
		const r = guard();
		expect(r.exitCode).toBe(1);
		expect(r.stdout).toContain('This PR changes graphify-out/ and other files');
		expect(r.stdout).toContain('graphify-out/GRAPH_REPORT.md');
		expect(r.stdout).not.toContain('src/app.ts');
	});

	it('fails a PR that moves a file out of graphify-out/', () => {
		mkdirSync(join(repo, 'docs'));
		renameSync(join(repo, 'graphify-out/GRAPH_REPORT.md'), join(repo, 'docs/GRAPH_REPORT.md'));
		commit('move');
		const r = guard();
		expect(r.exitCode).toBe(1);
		expect(r.stdout).toContain('graphify-out/GRAPH_REPORT.md');
	});

	it('fails a PR that changes code and a graph file with a non-ASCII name', () => {
		write('src/app.ts', 'export const a = 1;\n');
		write('graphify-out/wiki/Économie.md', '# page\n');
		commit('mixed');
		const r = guard();
		expect(r.exitCode).toBe(1);
		expect(r.stdout).toContain('This PR changes graphify-out/ and other files');
	});

	it('counts a directory named like graphify-out/ but longer as code', () => {
		write('graphify-outdated/note.md', 'x\n');
		commit('lookalike');
		const r = guard();
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain('0 graphify-out/ files and 1 other files changed');
	});

	it('diffs from the merge base, so graph changes on main do not count', () => {
		git('switch', '-q', 'main');
		write('graphify-out/GRAPH_REPORT.md', '# graph v2\n');
		commit('refresh on main');
		git('update-ref', 'refs/remotes/origin/main', 'main');
		git('switch', '-q', 'pr');
		write('src/app.ts', 'export const a = 1;\n');
		commit('code');
		const r = guard();
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain('0 graphify-out/ files and 1 other files changed');
	});

	it('takes the base from GRAPHIFY_GUARD_BASE', () => {
		write('src/app.ts', 'export const a = 1;\n');
		write('graphify-out/GRAPH_REPORT.md', '# graph v2\n');
		commit('mixed');
		git('update-ref', 'refs/remotes/origin/release', 'HEAD');
		const r = guard({ GRAPHIFY_GUARD_BASE: 'origin/release' });
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain('ok against origin/release');
	});

	it('fails when the base ref is missing instead of passing', () => {
		write('src/app.ts', 'export const a = 1;\n');
		write('graphify-out/GRAPH_REPORT.md', '# graph v2\n');
		commit('mixed');
		git('update-ref', '-d', 'refs/remotes/origin/main');
		const r = guard();
		expect(r.exitCode).not.toBe(0);
		expect(r.stdout).not.toContain('graphify-out guard: ok');
	});
});
