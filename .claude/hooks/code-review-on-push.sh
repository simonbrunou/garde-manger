#!/usr/bin/env bash
# PostToolUse hook — wired in .claude/settings.json on the Bash matcher with
# `"if": "Bash(git push*)"`, so it only runs after a `git push`.
#
# If the just-pushed branch has an OPEN pull request, it injects an instruction
# back to Claude to run the agent-based /code-review on that PR. (A local Claude
# Code hook can't run the agent review itself — it nudges the session to do it,
# so this only fires for pushes made from within a Claude Code session.)
set -euo pipefail

# Current branch's PR as "<number> <url>", only when OPEN. `gh pr view` exits
# non-zero when the branch has no PR → the hook silently no-ops.
info=$(gh pr view --json number,url,state -q 'select(.state=="OPEN") | "\(.number) \(.url)"' 2>/dev/null) || exit 0
[ -n "$info" ] || exit 0

num=${info%% *}
url=${info#* }
ctx="A git push to open PR #${num} (${url}) just landed. Per the user's standing request, run /code-review on PR #${num} now — the agent-based review (5 parallel Sonnet reviewers + Haiku confidence scoring) — then post the summary comment to the PR."

# Emit PostToolUse additionalContext (JSON-escaped via python3 for safety).
printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":%s}}\n' \
	"$(printf '%s' "$ctx" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')"
