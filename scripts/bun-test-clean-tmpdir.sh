#!/bin/sh
# Run `bun test <paths>` with TMPDIR set to a new empty directory, and fail when a
# test leaves anything there (#83). CI's unit-test step runs this.
set -e
TMPDIR="$(mktemp -d)"
export TMPDIR
# CI sets no NODE_COMPILE_CACHE, so Node tools the tests spawn (tsc) cache their code in TMPDIR
# there. The maintainer's shells set it (nix home/shell.nix, nix#86), which would pass a run CI fails.
unset NODE_COMPILE_CACHE
bun test "$@"
leftover="$(ls -A "$TMPDIR")"
if [ -n "$leftover" ]; then
	printf 'Unit tests left files in TMPDIR; remove them in an afterEach or afterAll hook:\n%s\n' "$leftover"
	exit 1
fi
rmdir "$TMPDIR"
echo "TMPDIR is empty after the unit tests"
