#!/bin/sh
# Fail when the commits since the merge base with GRAPHIFY_GUARD_BASE (default
# origin/main) change a file under graphify-out/ and a file outside it (#58).
# A graph refresh PR changes graphify-out/ only, and a code PR leaves it alone.
# CI's verify job runs this on every PR to main.
set -e
base="${GRAPHIFY_GUARD_BASE:-origin/main}"
# A missing base ref fails here, so the guard never passes without a base.
mb="$(git merge-base "$base" HEAD)"
# The pathspecs, not a grep on the output, sort the paths: git quotes a path
# with non-ASCII bytes. Git applies a pathspec before it detects renames, so a
# move out of graphify-out/ shows up in both lists.
graph="$(git diff --name-only "$mb" HEAD -- ':(top)graphify-out/')"
other="$(git diff --name-only "$mb" HEAD -- ':(top,exclude)graphify-out/')"
if [ -n "$graph" ] && [ -n "$other" ]; then
	printf 'This PR changes graphify-out/ and other files. Only a graph refresh PR may change graphify-out/, and it changes nothing else.\n'
	printf 'Put graphify-out/ back as it is at the base, then commit: git restore --source=%s --staged --worktree -- graphify-out\n' "$mb"
	printf '%s\n' "$graph"
	exit 1
fi
count() {
	if [ -z "$1" ]; then echo 0; else printf '%s\n' "$1" | wc -l | tr -d ' '; fi
}
echo "graphify-out guard: ok against $base ($(git rev-parse --short "$mb")): $(count "$graph") graphify-out/ files and $(count "$other") other files changed"
