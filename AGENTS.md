## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- Refresh the graph only in a dedicated chore PR cut from an up-to-date `main` in the main checkout, so feature PRs, fix PRs and worktree commits carry no `graphify-out/` changes. CI enforces it: the `verify` job runs `scripts/check-graphify-out.sh`, which fails a PR that changes `graphify-out/` and any other file, so a refresh PR changes `graphify-out/` only, and a `.gitignore` change the refresh needs lands first in its own PR. This rule overrides the "Run `graphify update .` after code changes" line in GRAPH_REPORT.md. See `docs/agents/graphify.md` for the reasons, the git hooks and undoing a stray run.

## Coding behavioral guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Merge authority

Agents may merge their own PR without asking once all three hold:

- A code review ran on the diff (the `code-review` skill or the `pr-review-toolkit:code-reviewer` agent) and its real findings are fixed, nits aside (the global agent rules define a nit).
- CI is green on the pushed SHA.
- The branch has no conflict with `origin/main`. With the pushed SHA checked out, run `git fetch origin`, then `git merge-tree --write-tree origin/main HEAD` must exit 0.

A branch behind `main` with no conflict merges as it is, on the CI run it already has. The accepted risk is that two PRs that each pass on their own can break `main` together, and the CI run on `main` after the merge shows it. On a conflict, merge `origin/main` into the branch and resolve it. Run the steps of the `verify` job in `.forgejo/workflows/ci.yml`, push, and check the three conditions again on the new head. That local run is only a pre-check, because the dev shell's Bun can trail CI's (see Bun version).

After every merge, check whether to wait for `main`'s CI run:

1. Run `git fetch origin`. Take the merge SHA from `merge_commit_sha` in `python3 -I ~/.agents/skills/forgejo-issues/scripts/forgejo.py get garde-manger#<n>`, since `fj pr -R origin merge` prints none.
2. Run `git rev-parse <merge SHA>^{tree} <pushed SHA>^{tree}`. Two different hashes mean the merge commit holds files CI has not tested together, as when the branch was behind `main`, so wait (step 4).
3. The same hash twice means the merge commit holds the files the PR's CI passed, since the PR run checks out the pushed SHA itself. Run `bun scripts/check-push-repeats-pr.ts <pushed SHA>` in a checkout with its dependencies installed. It checks that the `push` run on `main` repeats the PR run's jobs and steps, and its header lists what it reads, the differences this repo's CI keeps on purpose and what it cannot see. Exit 0 means skip the wait. Any other exit means wait (step 4); it printed each difference it found.
4. To wait, read `main`'s CI state as step 3 of the deploy check in `docs/agents/deploy.md` says, and fix a red run in a new PR.

The production deploy that the merge triggers is accepted. Ask first only when the PR drops or rewrites stored data (a destructive migration, a backfill that overwrites rows). To check a production deploy, after a merge or whenever someone asks what `main` runs in production, follow `docs/agents/deploy.md`.

## Bun version

CI and production run the Bun that the repo pins. The pin is the version in the `packageManager` field of `package.json`, such as `1.4.4` in `bun@1.4.4`. Renovate bumps it there. Production installs it. Railpack reads the field and names it `idiomatic-version-file` in the deploy log's build plan. CI installs it too. Both jobs of `.forgejo/workflows/ci.yml` run setup-bun with `bun-version-file: package.json`. The step then logs `Obtained version <pin> from package.json`. The fallback `Dockerfile` names the same version in both `FROM` tags, `oven/bun:<pin>` and `oven/bun:<pin>-slim`. A `renovate.json` rule puts those tags and `packageManager` in one Renovate group, so one PR bumps all three. When npm lists a Bun release before Docker Hub does, that PR can merge with `packageManager` alone, and a later PR then bumps the tags. Keep the field a plain `bun@x.y.z`, because setup-bun takes everything after `bun@` as the version, a `+sha512...` suffix included. The dev shell runs the Bun of the nixpkgs rev that `flake.lock` locks, and `nix develop -c bun --version` prints it. That Bun equals the pin after a lock bump like the one for #110. It falls behind when Renovate bumps `packageManager` again, because Renovate leaves `flake.lock` alone (#61 kept its `nix` manager off). A check proves a change only when it ran on the pinned Bun, as CI's run does.

To close the gap, run `nix eval --raw github:NixOS/nixpkgs/nixos-unstable#bun.version`. When it prints the pin, run `nix flake update nixpkgs`, check that `nix develop -c bun --version` prints the pin, and move `flake.lock` in a PR of its own. The bump also moves the dev shell's Node, so run the `verify` job's steps and the e2e suite in the bumped shell before you open it.

A Bun other than the pinned one can write a different `bun.lock`. Bun 1.3.13, which the dev shell ran on 2026-11-06, drops the `libc` field of platform-specific packages, so an install from its lock also installs their musl builds. It can also resolve an npm alias to another version. `bun install --frozen-lockfile` on the pinned Bun accepts such a lock, so CI does not catch it. Write every lock change through the pinned Bun, as in `env TMPDIR=/tmp bunx bun@<pin> install` or `env TMPDIR=/tmp bunx bun@<pin> add <package>`. `bunx` keeps its copy of the pinned Bun, about 200 MB, in TMPDIR. `nix develop -c` gives each of its calls a fresh TMPDIR that it never removes. With `TMPDIR=/tmp`, every call reuses one copy.

To run a check on the pinned Bun while the dev shell runs another (the unit tests, `bun run build`, the e2e suite), put that copy first on `PATH` as both `bun` and `bunx`. `bun run build` calls `bunx`, and without a `bunx` link it runs the dev shell's `bunx` with no error. Keep one directory per pin, so a worktree on another pin cannot overwrite your links. The single quotes keep `$PATH` unexpanded until the inner `sh` runs, so the dev shell's `node` stays on the path.

```sh
P=$(nix develop -c env TMPDIR=/tmp bunx bun@<pin> -e 'console.log(process.execPath)')
mkdir -p /tmp/bun-<pin> && ln -sf "$P" /tmp/bun-<pin>/bun && ln -sf "$P" /tmp/bun-<pin>/bunx
nix develop -c sh -c 'PATH=/tmp/bun-<pin>:$PATH; bun --version; bunx --version; bun run test'
```

`bun --version` and `bunx --version` must both print the pin. A missing or broken link makes its command print the dev shell's version and exit 0, so rerun the first two lines then. For the e2e suite, run `PORT=<port> npx playwright test` in place of `bun run test`, as CI runs `npx playwright test`, with the port that the steps in E2E tests below pick.

While the dev shell runs another Bun than the pin, a unit test can fail there and pass on the pin. Before you blame a failing unit test on a change, rerun it on the pinned Bun by the recipe above. Bun 1.3.13, which the dev shell ran on 2026-11-12, fails the three `webPushSender address pin` tests in `src/lib/server/webPushSender.test.ts`, which pass on 1.4.4 (#110).

## E2E tests

Outside CI, Playwright reuses whatever already listens on the e2e port (`reuseExistingServer` in `playwright.config.ts`) instead of wiping `.e2e` and building fresh. A server left from an earlier run, or another checkout's server on the same port, then serves stale code and an old DB, and new routes or UI fail while the code is fine. So run each suite on a port nothing listens on. Stop only a server you started, by its saved PID: a port or a process name matches the servers of every checkout on the host, another worktree's e2e run included.

The e2e port is the `PORT` environment variable, 4173 when unset (`tests/e2e/fixtures/constants.ts`), as in CI. Any other value that is not a whole number from 1 to 65535, the empty string included, stops Playwright with an error naming `PORT`. Pick the port by these steps:

1. Take 4000 plus your issue number (4127 for #127). With no issue, take the PR number, since Forgejo numbers issues and PRs from one sequence. With neither, take 4000.
2. Run `ss -ltn 'sport = :<port>'`. While it lists a listener (your own earlier run, another checkout's server, a diversif worktree on the same 4000 + N scheme), add 1 and run it again.
3. Run the suite as `PORT=<port> npx playwright test`.

A server you start by hand, such as the production build to reproduce a bug, takes a port by the same steps and saves its PID in a `.pid` file, which `.gitignore` ignores. Build it for that port first with `ORIGIN=http://localhost:<port> bun run build`: the build fixes its origin (`paths.origin` in `vite.config.ts`), so on any other port every form POST fails with 403 `Cross-site POST form submissions are forbidden`. With no `DATABASE_PATH`, it opens the checkout's `data/garde-manger.db`. Start it with `PORT=<port> bun ./build/index.js > /tmp/gm-<port>.log 2>&1 & echo $! > server.pid`, inside `nix develop -c sh -c '…'` where direnv has not run, and stop it with `kill "$(cat server.pid)"`. Start `bun ./build/index.js` directly, since a wrapper leaves `$!` on a process that does not listen: `bunx --bun vite preview` saved one PID while `ss -ltnp` showed the listener under another. `bun run preview` does not start at all; Vite fails with `ERR_UNSUPPORTED_ESM_URL_SCHEME` on a `bun:` import.

## Scratch copies

Give a copy of the checkout (a probe tree, a tree extracted with `git archive`) its own `node_modules`. Run `env TMPDIR=/tmp bunx bun@<pin> install --frozen-lockfile` in the copy (see Bun version), or `cp -a --reflink=auto <checkout>/node_modules <copy>/`. `svelte-kit sync` writes the tsconfig base to `node_modules/$app/tsconfig.json`. Its `rootDirs` (`../..` and `../../.svelte-kit/types`) resolve from wherever that `node_modules` really lives. With `node_modules` symlinked to another checkout, `bun run check` in the copy reports `Cannot find module './$types'` in every file that imports it. With its own `node_modules`, the copy passes. The check ends with `scripts/check-tsconfig-coverage.ts`, which lists the tracked TypeScript files with `git ls-files` and fails outside a git repository, so run `git init -q && git add -A` in a tree extracted with `git archive`.

## Agent skills

### Issue tracker

Forgejo issues on `git.sbrn.eu` via the `fj` CLI, with the REST API for JSON reads and blocking links. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one root `GLOSSARY.md` plus `docs/adr/`. See `docs/agents/domain.md`.
