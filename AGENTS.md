# open-tag — notes for AI coding agents

open-tag is an open-source, self-hosted alternative to Claude Tag: a Slack-style
workspace where people and AI agents collaborate as teammates. Read `README.md`
first for what it is and how to run it, then `CLAUDE.md` for the full development
guide (codemap, doc-sync discipline, code quality rules, and agent-prompt red lines).

## Code map (quick ref)

- `src/server/` — control plane + data plane (REST + WebSocket): messages, `seq`,
  `@`-mentions, wake delivery, auth, scopes, reminders
- `src/daemon/` — local daemon: agent lifecycle, runtime adapters (claude / codex),
  system-prompt injection
- `src/cli/`    — the CLI agents use to talk to the server (`open-tag` command)
- `src/db/`     — Drizzle schema + seed
- `web/`        — React + Vite SPA

## Conventions

- TypeScript throughout. Run `npm run typecheck` (root + web) before committing.
- The standing agent prompt (`src/daemon/prompt.ts`) is shared by every runtime —
  keep it runtime-agnostic; don't hard-code tool names specific to one provider.
- Agent workspace lives at `~/.open-tag/agents/<agent-id>/` with a `MEMORY.md` per agent.
- Doc sync is a hard rule: every code change must update the corresponding docs in
  the same commit. See `CLAUDE.md` for the full sync table and `/doc-sync` skill.
- Parallel development: use `npm run wt:add -- <name>` to spin up an isolated git
  worktree (its own ports + database + seeded data) instead of reusing one workspace;
  `npm run wt:rm -- <name>` tears it down. Lets several features (or agents) run side
  by side without port or database collisions.
- Browser verification: check your own web UI with the chrome-devtools MCP. When
  several agents or worktrees run in parallel, start chrome-devtools with `--isolated`
  so each gets its own Chrome instance instead of fighting over a shared one.
