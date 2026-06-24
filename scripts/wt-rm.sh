#!/usr/bin/env bash
# Safely remove a worktree: stop its server/vite first, then git worktree remove.
# Usage: npm run wt:rm -- <name>
set -euo pipefail
NAME="${1:-}"
[ -z "$NAME" ] && { echo "Usage: npm run wt:rm -- <name>"; exit 1; }
WT="../open-tag-$NAME"
[ -d "$WT" ] || { echo "✗ $WT does not exist"; exit 1; }

# 1) Stop this worktree's server/vite (by the ports in its .env).
if [ -f "$WT/.env" ]; then
  for k in PORT VITE_PORT; do
    v=$(grep -E "^$k=" "$WT/.env" | cut -d= -f2 || true)
    [ -n "${v:-}" ] && lsof -ti "tcp:$v" 2>/dev/null | xargs kill 2>/dev/null || true
  done
fi

# 2) Remove the worktree (--force: it has untracked .env/node_modules).
git worktree remove "$WT" --force
echo "✅ worktree '$NAME' removed."
echo "   Note: database opentag_${NAME//[^a-zA-Z0-9]/_} and branch feature/$NAME are kept (data/branch preserved). To clean up:"
echo "   docker compose exec -T postgres dropdb -U opentag opentag_${NAME//[^a-zA-Z0-9]/_}  ·  git branch -D feature/$NAME"
