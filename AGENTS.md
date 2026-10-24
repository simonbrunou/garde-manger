## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- Refresh the graph only in a dedicated chore PR cut from an up-to-date `main` in the main checkout (#53); this overrides the "Run `graphify update .` after code changes" line in GRAPH_REPORT.md. Keep `graphify update .` output out of feature and fix PRs and out of worktree commits: it rewrites graph.json wholesale and relabels communities, so two code PRs that both carry it conflict, and from a worktree it stamps the worktree's directory name into the graph. If graphify's git hooks are installed, they rebuild the graph in the main checkout after each commit, checkout, merge and rebase, so leave that output unstaged too. Undo a stray run with `git restore graphify-out`, then delete the untracked `graphify-out/.graphify_labels.pending.json`.

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

- A code review ran on the diff (the `code-review` skill or the `pr-review-toolkit:code-reviewer` agent) and its real findings are fixed.
- CI is green on the pushed SHA.
- The branch has no conflict with `origin/main`. With the pushed SHA checked out, run `git fetch origin`, then `git merge-tree --write-tree origin/main HEAD` must exit 0.

A branch behind `main` with no conflict merges as it is, on the CI run it already has. The accepted risk is that two PRs that each pass on their own can break `main` together, and the CI run on `main` after the merge shows it. On a conflict, merge `origin/main` into the branch and resolve it. Run the steps of the `verify` job in `.forgejo/workflows/ci.yml`, push, and check the three conditions again on the new head.

The production deploy that the merge triggers is accepted. Ask first only when the PR drops or rewrites stored data (a destructive migration, a backfill that overwrites rows).

## E2E tests

Outside CI, Playwright reuses whatever already listens on the e2e port 4173 (`reuseExistingServer` in `playwright.config.ts`) instead of wiping `.e2e` and building fresh. A server left from an earlier run, or a `bun run preview` (Vite's default port is also 4173), then serves stale code and an old DB, and new routes or UI fail while the code is fine. Free the port before each run with `fuser -k 4173/tcp || true`, which kills by port; `pkill -f build/index.js` would also match your own shell. The port is shared by every worktree on the host, so run one e2e suite at a time.

## Agent skills

### Issue tracker

Forgejo issues on `git.sbrn.eu` via the `fj` CLI, with the REST API for JSON reads and blocking links. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one root `GLOSSARY.md` plus `docs/adr/`. See `docs/agents/domain.md`.
