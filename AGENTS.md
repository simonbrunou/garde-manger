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

The production deploy that the merge triggers is accepted. Ask first only when the PR drops or rewrites stored data (a destructive migration, a backfill that overwrites rows). To check a production deploy, after a merge or whenever someone asks what `main` runs in production, follow `docs/agents/deploy.md`.

## Bun version

CI and production run the Bun that the repo pins, and the dev shell does not. The pin is the version in the `packageManager` field of `package.json`, such as `1.4.4` in `bun@1.4.4`. Renovate bumps it there. Production installs it. Railpack reads the field and names it `idiomatic-version-file` in the deploy log's build plan. CI installs it too. Both jobs of `.forgejo/workflows/ci.yml` run setup-bun with `bun-version-file: package.json`. The step then logs `Obtained version <pin> from package.json`. Keep the field a plain `bun@x.y.z`, because setup-bun takes everything after `bun@` as the version, a `+sha512...` suffix included. The dev shell takes `bun` from the nixpkgs that `flake.lock` locks, so it can trail the pin by several releases. A check proves a change only when it ran on the pinned Bun, as CI's run does.

A Bun other than the pinned one can write a different `bun.lock`. Bun 1.3.13, which the dev shell ran on 2026-11-06, drops the `libc` field of platform-specific packages, so an install from its lock also installs their musl builds. It can also resolve an npm alias to another version. `bun install --frozen-lockfile` on the pinned Bun accepts such a lock, so CI does not catch it. Write every lock change through the pinned Bun, as in `env TMPDIR=/tmp bunx bun@<pin> install` or `env TMPDIR=/tmp bunx bun@<pin> add <package>`. `bunx` keeps its copy of the pinned Bun, about 200 MB, in TMPDIR. `nix develop -c` gives each of its calls a fresh TMPDIR that it never removes. With `TMPDIR=/tmp`, every call reuses one copy.

To run a check on the pinned Bun (the unit tests, `bun run build`, the e2e suite), put that copy first on `PATH` as both `bun` and `bunx`: `bun run build` calls `bunx`, and the e2e server runs `bun`. One directory per pin keeps a session on another pin from repointing yours. The single quotes leave `$PATH` for the dev shell to expand, so its `node` stays on the path.

```sh
P=$(nix develop -c env TMPDIR=/tmp bunx bun@<pin> -e 'console.log(process.execPath)')
mkdir -p /tmp/bun-<pin> && ln -sf "$P" /tmp/bun-<pin>/bun && ln -sf "$P" /tmp/bun-<pin>/bunx
nix develop -c sh -c 'PATH=/tmp/bun-<pin>:$PATH; bun --version; bun run test'
```

## E2E tests

Outside CI, Playwright reuses whatever already listens on the e2e port 4173 (`reuseExistingServer` in `playwright.config.ts`) instead of wiping `.e2e` and building fresh. A server left from an earlier run, or a `bun run preview` (Vite's default port is also 4173), then serves stale code and an old DB, and new routes or UI fail while the code is fine. Free the port before each run with `fuser -k 4173/tcp || true`, which kills by port; `pkill -f build/index.js` would also match your own shell. The port is shared by every worktree on the host, so run one e2e suite at a time.

## Scratch copies

Give a copy of the checkout (a probe tree, a tree extracted with `git archive`) its own `node_modules`. Run `env TMPDIR=/tmp bunx bun@<pin> install --frozen-lockfile` in the copy (see Bun version), or `cp -a --reflink=auto <checkout>/node_modules <copy>/`. `svelte-kit sync` writes the tsconfig base to `node_modules/$app/tsconfig.json`. Its `rootDirs` (`../..` and `../../.svelte-kit/types`) resolve from wherever that `node_modules` really lives. With `node_modules` symlinked to another checkout, `bun run check` in the copy reports `Cannot find module './$types'` in every file that imports it. With its own `node_modules`, the copy passes.

## Agent skills

### Issue tracker

Forgejo issues on `git.sbrn.eu` via the `fj` CLI, with the REST API for JSON reads and blocking links. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one root `GLOSSARY.md` plus `docs/adr/`. See `docs/agents/domain.md`.
