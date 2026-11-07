# graphify

The rule itself lives in the `## graphify` section of [`AGENTS.md`](../../AGENTS.md): refresh the graph only in a dedicated chore PR cut from an up-to-date `main` in the main checkout. This file holds the reasons, what the git hooks do, and how to undo a stray run.

## Why a refresh gets its own PR

- A refresh rewrites graph.json and relabels communities, so two code PRs that each carry one conflict.
- A refresh run from a worktree writes the worktree's directory name into the GRAPH_REPORT.md heading.

## The git hooks

If someone ran `graphify hook install`, its git hooks rebuild the graph in the main checkout after each commit, branch switch, merge and rebase. The hooks do nothing in a worktree. Leave their output unstaged.

## Undo a stray run

1. Run `git restore graphify-out`.
2. Delete the gitignored `graphify-out/.graphify_labels.pending.json`, since the next run reads community names from it.
