#!/usr/bin/env bash
# PreToolUse(Write|Edit): block edits to applied Drizzle migrations + meta.
# drizzle/*.sql and drizzle/meta/* are immutable applied history; editing one desyncs
# every deployed DB. Change src/lib/server/db/schema.ts and run `bun run db:generate`
# (see the /migration skill) to emit a NEW migration.
input=$(cat)
path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
case "$path" in
  */drizzle/*.sql|*/drizzle/meta/*|drizzle/*.sql|drizzle/meta/*)
    jq -n '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:"Refusing to edit an applied Drizzle migration. drizzle/*.sql and drizzle/meta/* are immutable history — editing one desyncs every deployed DB. Edit src/lib/server/db/schema.ts and run `bun run db:generate` for a NEW migration (see the /migration skill)."}}'
    ;;
esac
exit 0
