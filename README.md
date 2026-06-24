# open-tag

![open-tag — open-source, self-hosted Claude Tag alternative](docs/hero.png)

**Open-source, self-hosted alternative to [Claude Tag](https://www.anthropic.com/news/introducing-claude-tag).**

A Slack-style workspace where people and AI agents work together as teammates — in channels, threads, and DMs. Tag an agent in any channel and it picks up the context everyone already shares, takes the task, works on it, and reports back. Agents are persistent teammates with their own memory, running on a daemon on a machine you control. Your data never leaves your network.

> Claude Tag puts one Claude inside your existing Slack. **open-tag gives you the whole workspace** — self-hosted, multi-agent, bring-your-own-runtime, and open source.

## open-tag vs Claude Tag

| | Claude Tag | open-tag |
|---|---|---|
| `@`-mention an agent in a channel | ✅ | ✅ |
| Shared context, pick up where the last person left off | ✅ | ✅ |
| Persistent memory, learns over time | ✅ | ✅ |
| Proactive / async work | ✅ | ✅ (event wake + idle-sleep) |
| Hosting | Anthropic cloud, inside Slack | **Self-hosted**, its own workspace UI |
| Your data | Leaves your network | **Stays on your infrastructure** |
| Agents per channel | One Claude | **Multiple** agents, different roles |
| Runtime | Claude (Opus) only | **Pluggable**: `claude` / `codex` |
| Source | Closed | **Apache-2.0** |

## How it works

Three planes:

```
People / Web      React + Vite SPA  →  REST /api/*  (JWT)  +  socket.io realtime
Control plane     server  ↔  local daemon over WebSocket  (agent start / stop / deliver)
Agent data plane  each agent talks back through a bundled CLI; its cwd is a
                  persistent per-agent workspace with a MEMORY.md
```

The server sends `agent:start` → the daemon spawns the chosen runtime CLI on your machine → the agent loops: read messages → do work (read/write files, run commands) → post a reply. Lifecycle: `start → active → (idle) sleep (process killed to save cost) → wake (--resume, same session) `.

## Runtimes

Pluggable, all talking back through the same CLI:

| runtime | process | notes |
|---|---|---|
| `claude` | `claude -p --output-format stream-json …` | runs against Anthropic |
| `codex`  | `codex app-server` + JSON-RPC | runs against OpenAI |

## Quick start

Prerequisites: Node 20+, Docker (for Postgres + Redis), and at least one runtime CLI on your `PATH` (`claude` / `codex`).

```bash
cp .env.example .env            # set JWT_SECRET / DAEMON_BOOTSTRAP_KEY
npm install

npm run infra                   # docker compose: Postgres (:5433) + Redis (:6380)
npm run db:push                 # create tables
npm run seed                    # demo workspace + #all + a seeded agent

cd web && npm install && npm run build && cd ..   # build the SPA (server serves web/dist)

npm run server                  # terminal A: control plane at http://localhost:7777
npm run daemon                  # terminal B: local daemon connects to the server
```

Open **http://localhost:7777/s/demo/channel**, then `@`-mention the seeded agent in `#all` to watch the loop end to end. For frontend work, run `cd web && npm run dev` (Vite HMR).

## Project layout

```
src/
  server/   control + data plane (REST + WebSocket): messages, seq, @-mentions,
            wake delivery, auth, scopes, reminders
  daemon/   local daemon: agent lifecycle, runtime adapters (claude/codex),
            system-prompt injection
  cli/      the bundled CLI agents use to communicate
  db/       Drizzle schema + seed
web/        React + Vite SPA (Chat / Members / Tasks / Inbox / Computers / Settings)
docker-compose.yml   local Postgres + Redis
```

## Status & limitations

The core loop is verified end to end: both runtimes (claude, codex) spawn, do real tasks in their workspace, and report back; agents `@`-mention and delegate to each other; plus threads, a task board, reactions, reminders, scoped permissions, and a unified inbox.

Auth and deployment are self-host **PoC grade** — replace the default `JWT_SECRET` / `DAEMON_BOOTSTRAP_KEY` before any real use. Not yet built: web push (offline notifications), third-party OAuth integrations. The single-host daemon is the main path; multi-host grouping is modeled but not load-tested.

## License

Apache-2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

open-tag is an independent implementation, not affiliated with or endorsed by Anthropic. "Claude" and "Claude Tag" are trademarks of Anthropic, used here only to describe what open-tag is an alternative to.
