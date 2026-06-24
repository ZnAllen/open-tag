# open-tag

**open-tag** is an open-source, self-hosted alternative to Claude Tag — a Slack-style
multi-agent workspace where humans and AI agents collaborate as teammates in channels,
threads, and DMs. Agents are persistent teammates with their own memory, running on a
daemon on a machine you control; data stays in your network.

The project's own mission: accumulate memory, keep docs in sync with code, and drive
its own iterative improvement — autonomously.

## This file is a map, not a manual

> Harness engineering principle: **give the agent a map, not a thousand-page handbook**.
> Architecture details, data models, and contracts live in the files this map points to —
> don't pile detail here (it goes stale, bloats context, and can't be mechanically verified).
> When you change the architecture, update `ARCHITECTURE.md`, not this file.

**Read these first (jump as needed):**

- **`docs/MISSION.md`** — **North star / working directive**: what open-tag is building
  toward; evidence-driven slices, browser-verified. **Read before adding any feature.**
- **`ARCHITECTURE.md`** — Repository codemap: three planes, what every file does,
  architectural invariants, module boundaries, cross-cutting concerns.
  **"Where does X live?" / "What is this module for?" — check here first.**
- **`docs/core-beliefs.md`** — Load-bearing project beliefs: `src/` is canonical,
  `docs/` vs generated docs discipline, three-plane auth, credential hygiene, etc.
  Scan before you touch anything.
- **`docs/tech-debt-tracker.md`** — Known doc/implementation drift and debt.
  Check for a relevant item before making changes.
- **`docs/generated/db-schema.md`** — Ground truth for the data model
  (generated from `src/db/schema.ts`).
- **`docs/PLANS.md`** — Plan conventions + in-progress plans + roadmap index.
- **`README.md`** — How to run (`npm run server` / `daemon` / `cd web && npm run dev`)
  and verified evidence of what works.
- **`AGENTS.md`** — Short agent-oriented entry point; points here for the full guide.

## Doc-sync discipline (highest priority: code change = doc change)

> Docs naturally lag behind code. This project treats doc/code sync as a **hard rule**:
> every change must update the corresponding docs in the **same commit**.
> **Doc lag = an unfinished bug.** Self-check with the table below before marking done,
> then run `/doc-sync` (built-in skill at `.claude/skills/doc-sync/`) for a full audit.

| You changed… | Must also update |
|---|---|
| `src/db/schema.ts` (tables / columns) | `docs/generated/db-schema.md` |
| Routes/endpoints (`routes-api` / `routes-agent`), CLI sub-commands, daemon protocol | `ARCHITECTURE.md` codemap / boundaries / contracts |
| Module purpose / boundary / architectural invariant | `ARCHITECTURE.md` §II–IV |
| A feature (completed or modified) | `FEATURES.md` checkbox + `README.md` "Verified" section if relevant |
| Doc/code mismatch, or a TODO / tech debt left behind | `docs/tech-debt-tracker.md` — add an entry, don't let it rot silently |
| A complex change with a plan | `docs/PLANS.md` (convention) |

> Keep CLAUDE.md in "map" form: details go into their respective files.
> **Don't accumulate history or changelogs here** — that's what `git log` is for.

## Current state (one line)

- **Primary stack = `src/` (TypeScript) + `web/` (React + Vite)** + `docker compose`
  (Postgres + Redis). Root-level `*.mjs` files are **deprecated PoC stubs**
  (kept only for `poc:*` scripts); all new code goes in `src/`. See `ARCHITECTURE.md` §VI.
- Verified working: two runtimes (claude / codex), agent lifecycle (including idle-sleep),
  multi-agent collaboration, group chat / task board / threads / member groups.
  Evidence in `README.md` "Verified" section.

## Code quality rules

### Eight shalls and eight shall-nots

**Shall:** Understand where an interface comes from and why it exists; trace upstream
and downstream dependencies when necessary.
**Shall not:** Guess at interfaces without reading the code or docs.

**Shall:** Clarify goal, boundary conditions, and input/output before writing anything.
**Shall not:** Start coding with a fuzzy understanding, then rely on luck to pass review.

**Shall:** Ask the product owner or backend directly when business logic is unclear.
**Shall not:** Fill in missing information with assumptions and treat them as facts.

**Shall:** Reuse existing interfaces, components, and conventions to keep the system
consistent and maintainable.
**Shall not:** Casually invent a new interface or utility for the sake of it.

**Shall:** Verify code against edge cases, error paths, concurrency, and perf paths.
**Shall not:** Only test the happy path and hope for the best.

**Shall:** Code structure follows the architecture; style follows team conventions —
even when refactoring is expensive.
**Shall not:** Ship "it runs" code that ignores the architecture.

**Shall:** Admit "I don't know" and look it up; make decisions with data.
**Shall not:** Bluff, over-explain, or use confidence to cover ignorance.

**Shall:** Understand the original intent, assess impact, and fully verify before
changing any code.
**Shall not:** Spot a problem and immediately patch it — that turns one bug into three.

**Shall:** Use the minimum code that solves the problem; prefer reuse over invention,
simple over "flexible".
**Shall not:** Write 200 lines of code for a 50-line problem, or add extension points
nobody asked for.

**Shall:** Make surgical changes — every line in the diff must trace back to the
current requirement.
**Shall not:** Opportunistically "clean up" adjacent code or reformat things you
dislike; that turns diffs into archaeology.

**Shall:** When two conflicting patterns exist in the codebase, pick the newer / more
central / more widely depended-on one, state why, and mark the other as pending cleanup.
**Shall not:** Write "satisfies both" code — dual error handlers, calling old and new
APIs simultaneously, mixing two state-management systems. Hybrids are harder to
maintain and harder to debug than either pure form.

### Agent-prompt red line (load-bearing)

`src/daemon/prompt.ts` is the **standing system prompt shared by every runtime**
(claude, codex, and any future runtime). It must stay **runtime-agnostic**:

- Do **not** hard-code tool names specific to one provider (e.g. `Read`, `cat`,
  `grep`, vision-specific instructions).
- Describe capabilities in generic terms.
- After editing, `grep` for provider-specific tool names to confirm zero hits.

### Verification before "done"

Completing code ≠ completing the task. Verification layers (use every applicable one):

1. **Unit tests** — verify logic correctness.
2. **Integration / E2E tests** — verify API endpoints, DB operations, module wiring.
3. **Real-run verification** — `curl` real endpoints; open the browser with the
   chrome-devtools MCP (pass `--isolated` when running in parallel so you get your own
   Chrome instance instead of grabbing a shared one) and confirm rendering and
   interaction; run CLI commands and confirm output. Never just "feel like it should work."
4. Post real evidence (command output, screenshot, test results) before claiming done.

**Fail loudly — no silent failures.** Every "done" claim must explicitly list:
- What was skipped or filtered out.
- Any warnings (compiler, runtime, migration constraints).
- What was not verified — which paths / edge cases were not exercised.

"Migration succeeded / tests passed / feature OK" is not trusted on its own;
it must be accompanied by the above checklist.
