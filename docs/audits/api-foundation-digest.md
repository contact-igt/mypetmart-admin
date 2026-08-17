# API foundation build/verify — digest

Date: 2026-08-04
Scope: `apps/api` scaffold (Express 5.2 + TypeScript + Prisma), `compose.yaml`,
`.env.example`, root scripts.

---

## Final result: **PARTIAL**

Everything that does not require a running database is built, verified, and
green. The one done-condition that cannot be met in this environment is
**"MySQL container becomes healthy"** and its downstream consequence
(`GET /health` returning HTTP 200 with `database: connected`) — **Docker and
Docker Compose are not installed on this machine** (confirmed: no `docker`
binary, no daemon, no Colima/Podman fallback either). Per this task's own
first instruction — *"Precheck Docker and Docker Compose. If unavailable,
stop; do not install them"* — Docker installation was correctly left to you.

You chose "scaffold now, verify DB later" when asked. Everything below
reflects that path: the API is fully built and internally consistent, and
`/health` honestly reports the database as unreachable rather than crashing
or faking a connected state.

---

## Iterations

**1 of 3 allotted**, with two hard stops for your explicit decision (not
counted as failed iterations — both were environment/tooling discoveries,
resolved on the first attempt once you answered):

1. **Docker precheck** — unavailable → asked whether to pause or scaffold
   without DB verification → you chose to scaffold.
2. **Prisma 7 breaking schema change** — `@prisma/client`/`prisma` resolved
   to `7.9.1` by default, which removed the `datasource { url = env(...) }`
   pattern in favour of a `prisma.config.ts` + driver-adapter model. Rather
   than adopt Prisma 7's new adapter-package architecture inside a
   foundation-stage task, pinned to **`prisma@6.19.2`** (the last pre-7
   release, `prev` on npm) — same ORM, same locked stack, materially less
   moving parts. Documented as a deliberate version choice, not a stack
   change.
3. **pnpm's ignored-builds gate** — adding Prisma triggered pnpm's
   supply-chain build-script gate, which then hard-failed *every* `pnpm run`
   command workspace-wide, including `pnpm typecheck:web` (confirmed as a
   regression against previously-passing, untouched code — not a code
   issue). Fix required a 3-line edit to `pnpm-workspace.yaml`'s existing
   `allowBuilds` list (already used for `sharp`/`unrs-resolver` for the
   identical reason) — outside this task's declared blast radius, so I
   stopped and asked before making it. You approved.

No other implementation/evaluation cycles were needed — typecheck, lint, and
tests each had one small fix-on-first-run (below) and then passed clean.

---

## Versions installed

| Package | Version | Notes |
|---|---|---|
| Node.js | v24.18.1 | matches root `engines: ">=24 <25"` |
| express | ^5.2.1 | locked stack |
| @prisma/client | 6.19.2 | pinned below the 7.x default — see iteration 2 |
| prisma (CLI) | 6.19.2 | same |
| typescript | ^5.9.3 | matches apps/web's major version |
| @types/express | ^5.0.6 | |
| @types/node | ^24.13.3 | pinned to Node 24, not npm's stale default resolution |
| eslint | ^9.39.5 | flat config, matches apps/web's ESLint 9 |
| typescript-eslint | ^8.65.0 | recommended flat config |

No test framework, no dotenv, no ts-node/tsx installed — Node 24's native
TypeScript execution (`node file.ts` with explicit `.ts` import extensions)
and `node --test` cover dev/test without extra tooling.

---

## Files changed

**New:**
- `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/eslint.config.mjs`
- `apps/api/prisma/schema.prisma` — generator + MySQL datasource only, no
  models yet (M1 is a separate, later task per `docs/PROJECT_BRIEF.md`)
- `apps/api/src/config/env.ts` — loads repo-root `.env` via
  `process.loadEnvFile()` if present (Node-native, no dotenv); falls back to
  compose.yaml-matching local-dev defaults so `pnpm dev:api` boots without a
  `.env` file
- `apps/api/src/db/prisma.ts` — Prisma Client singleton
- `apps/api/src/middleware/http-error.ts` — typed `HttpError` for expected
  4xx/5xx conditions
- `apps/api/src/middleware/not-found.ts` — 404 handler, `{ error: string }` body
- `apps/api/src/middleware/error-handler.ts` — central error handler;
  `HttpError`s return their own status/message, everything else (including
  raw Prisma/DB errors) is logged server-side only and collapsed to a
  generic 500 — never leaked to the client
- `apps/api/src/routes/health.ts` — `GET /health`
- `apps/api/src/routes/health.test.ts` — `node --test`, spins up the app on
  an ephemeral port, uses native `fetch` (no supertest)
- `apps/api/src/app.ts` / `apps/api/src/server.ts` — app/server separation
- `compose.yaml` (repo root) — MySQL 8.4, healthcheck, named volume
- `.env.example` (repo root) — shared by `compose.yaml` and `apps/api`; no
  real `.env` created or committed

**Modified:**
- `package.json` (root) — added `dev:api`, `typecheck:api`, `lint:api`,
  `test:api`, `prisma:validate`, `prisma:generate` scripts
- `pnpm-lock.yaml` — dependency resolution
- `pnpm-workspace.yaml` — `allowBuilds: prisma / @prisma/client /
  @prisma/engines` set to `true` (see iteration 3; explicitly approved,
  outside original blast radius)

**Untouched (confirmed via `git diff --stat apps/web/src/` — empty):**
- `apps/web/src/`
- `project-reference/`
- `CLAUDE.md`

---

## Commands run and results

```
node --version                → v24.18.1
pnpm typecheck:api            → PASS (clean tsc --noEmit)
pnpm lint:api                 → PASS (clean eslint; one unused eslint-disable
                                 comment fixed during the run)
pnpm test:api                 → PASS — 2/2 (node --test)
pnpm prisma:validate          → PASS ("The schema at prisma/schema.prisma is
                                 valid")
pnpm prisma:generate          → PASS (generated Prisma Client v6.19.2)
pnpm typecheck:web            → PASS (regression check — confirms apps/web
                                 unaffected)
pnpm lint:web                 → PASS (regression check)
```

Two small fix-on-first-run items during `typecheck:api`/`lint:api`:
- `health.test.ts`: `response.json()` returns `unknown` under this
  project's `lib: ["ES2023"]` (no DOM lib) — added a local `HealthBody`/
  `ErrorBody` type and cast.
- `error-handler.ts`: an `eslint-disable-next-line` comment for the 4-arg
  Express error-handler signature was flagged as unused (the configured
  rule doesn't actually complain about intentionally-unused, underscore-
  prefixed params) — removed the disable comment, kept the explanatory one.

---

## Database status

**Not running — Docker unavailable in this environment.** `docker`,
`docker compose`, Colima, and Podman were all checked and are absent. Per
this task's explicit instruction, Docker was not installed.

`compose.yaml` itself was structurally validated (parsed successfully via
`js-yaml`, already present as an ESLint transitive dependency — no new
package installed) but has never actually been run, so its healthcheck has
not been exercised end-to-end.

**To complete this once Docker is available:**
```bash
docker compose up -d
docker compose ps        # wait for mysql to show "healthy"
pnpm dev:api              # in another terminal
curl -s http://localhost:4000/health   # expect HTTP 200, database: "connected"
```

---

## Health response (as actually observed, right now)

```
$ curl -s -o /tmp/health-body.json -w "HTTP_STATUS:%{http_code}\n" http://localhost:4000/health
HTTP_STATUS:503

$ cat /tmp/health-body.json
{"status":"degraded","api":"ok","database":"unreachable"}

$ curl -s -o /dev/null -w "HTTP_STATUS:%{http_code}\n" http://localhost:4000/nonexistent-route
HTTP_STATUS:404
```

This is the **correct, honest** response given no database is reachable —
the API process itself is healthy (`api: "ok"`), it does not crash or hang
waiting on the DB, and it reports the dependency as down without leaking the
connection string, credentials, or a stack trace. The `health.test.ts` suite
asserts this shape explicitly (including a check that the serialized body
never contains `mysql://` or `password`), so this behaviour is regression-
tested regardless of whether Docker is present when tests run.

---

## Secret scan

- No real `.env` file exists anywhere in the repo (`find . -maxdepth 2 -name
  ".env"` → no results); only `.env.example` was created, matching this
  task's instruction.
- Grepped every changed/new file for private-key headers, AWS access-key
  patterns, Stripe/Slack/GitHub token prefixes — no matches.
- All credentials appearing in `compose.yaml`, `.env.example`, and
  `apps/api/package.json`'s `prisma:*` scripts are the same **local-dev-only
  default** (`mypetmart` / `mypetmart_dev_password`), intentionally
  duplicated in three places because each is a separate process context
  (Docker container env, app runtime fallback, standalone Prisma CLI
  invocation) that doesn't share the others' code path without a real
  `.env` — which this task explicitly says never to create. None of these
  are real secrets; they're placeholders identical in spirit to what
  `.env.example` documents.

## git status --short

```
 M package.json
 M pnpm-lock.yaml
 M pnpm-workspace.yaml
?? .env.example
?? apps/api/
?? compose.yaml
```

Nothing outside the (approved) blast radius. Nothing committed.

---

## Remaining risks / follow-ups

1. **Docker was never actually run.** `compose.yaml`'s healthcheck,
   MySQL 8.4 itself, and the `database: "connected"` path of `/health` are
   all unverified end-to-end. This is the only reason the result is
   PARTIAL rather than PASS.
2. **Prisma pinned to 6.19.2, not the npm `latest` (7.9.1).** This was a
   deliberate, documented choice (iteration 2) to avoid Prisma 7's new
   mandatory driver-adapter architecture inside a foundation-stage task.
   Revisit before M1 (schema + migrations) — Prisma 7 may be worth adopting
   once the adapter pattern is well-trodden, or 6.19.2 may simply remain the
   pin; either way this should be a deliberate call, not default drift.
3. **`DATABASE_URL` default is duplicated in three places** (`config/env.ts`,
   `compose.yaml`, `apps/api/package.json`'s `prisma:*` scripts) for the
   reason explained under Secret scan above. If a real `.env` becomes
   standard for this project, the `prisma:*` scripts could drop their inline
   default and rely on Prisma's own `.env` auto-discovery instead.
4. **No models in `schema.prisma` yet** — expected; M1 is scoped as a
   separate task.
5. **`pnpm-workspace.yaml` was modified outside the original blast radius.**
   Necessary and approved, but flagging again here for visibility since it's
   a shared, repo-wide config file.
