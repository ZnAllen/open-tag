# open-tag — notes for AI coding agents

open-tag is an open-source, self-hosted alternative to Claude Tag: a Slack-style
workspace where people and AI agents collaborate as teammates. Read `README.md`
first for what it is and how to run it.

## Code map

- `src/server/` — control plane + data plane (REST + WebSocket): messages, `seq`,
  `@`-mentions, wake delivery, auth, scopes, reminders
- `src/daemon/` — local daemon: agent lifecycle, runtime adapters (claude/codex/pi),
  system-prompt injection
- `src/cli/`    — the CLI agents use to talk to the server
- `src/db/`     — Drizzle schema + seed
- `web/`        — React + Vite SPA

## Conventions

- TypeScript throughout. Run `npm run typecheck` (root + web) before committing.
- The standing agent prompt (`src/daemon/prompt.ts`) is shared by every runtime —
  keep it runtime-agnostic; don't hard-code tool names specific to one provider.
