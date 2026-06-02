#!/usr/bin/env bash
# PreToolUse(Write|Edit): deny edits to secrets and the SQLite database files.
FILE=$(python3 -c "import json,sys; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null)
case "$FILE" in
  *.env | *.env.* | */data/*.db | */data/*.db-shm | */data/*.db-wal | data/*.db)
    cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Blocked by project policy: .env secrets and ./data/*.db files must not be modified by the agent. Edit them manually if genuinely required."}}
JSON
    ;;
esac
exit 0
