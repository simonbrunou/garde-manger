# graphify

The rule is the last bullet of the `## graphify` section of [`AGENTS.md`](../../AGENTS.md). This file holds the reasons, what the git hooks do and how to undo a stray run.

## Why refresh only in a chore PR from the main checkout

- A refresh rewrites graph.json and relabels communities, so two code PRs that each carry one conflict.
- A refresh run from a worktree writes the worktree's directory name into the GRAPH_REPORT.md heading.

## The git hooks

If someone ran `graphify hook install`, its git hooks rebuild the graph in the main checkout after each commit, branch switch, merge and rebase. The hooks do nothing in a worktree. Leave their output unstaged.

## Undo a stray run

1. Run `git restore graphify-out`. It leaves staged output in place, so if you staged it, run `git restore --staged --worktree graphify-out` instead.
2. Delete the gitignored `graphify-out/.graphify_labels.pending.json`, since the next run reads community names from it.
3. Delete `graphify-out/.graphify_build_state.json` if the run wrote one. graphify 0.9.103 writes it on each update, and `.gitignore` does not list it yet (#93), so step 1 leaves it as an untracked file.

The undo is done when `git status --short graphify-out` prints nothing.
