You're building the backend for Kachuful, a scorekeeper PWA for the Judgement/Kachuful card game
(live at https://play.vectanix.com; the React app lives in a separate repo and is being built in
parallel against the same API contract).

STEP 1: Create CLAUDE.md for this new project, following how I already work.

My existing Python repo is at: <PATH TO YOUR EXISTING PYTHON REPO>
Read it, but don't change anything there:

- its CLAUDE.md (and README, CONTRIBUTING, docs) first
- then pyproject/requirements, lint, format and type-check configs, pre-commit, Makefile or
  scripts, CI workflows, Docker/compose, and migrations setup
- then at least two real modules from every layer (routes, schemas, services, models or
  repositories, settings, tests, migrations)

Learn how things are actually done there: tooling and commands, folder structure and layering,
naming (modules, classes, functions, routes, JSON fields, env vars, tables, columns, constraints,
migrations, error codes, tests), code style, error handling, logging, API/DB/testing conventions,
git and CI habits. Where its docs and its code disagree, follow the code.

Then write this repo's CLAUDE.md in the same style as that repo's CLAUDE.md, combining:
(A) the standards you found there, which are the primary source for general style; and
(B) the Kachuful project rules between the two ===== lines below, which always apply.
For general style, (B) only fills gaps that (A) doesn't cover.

How to merge:

- Where (A) and (B) disagree on general style (naming, layout, tooling, test style), follow (A).
- Where (A) conflicts with a product or stack decision in plan-backend.md (FastAPI + PostgreSQL,
  same-origin /api, cookie sessions, frozen contract, camelCase JSON on the wire), the plan wins.
- Where (A) uses a library the plan doesn't list, ask me before adopting it.
- Leave out anything specific to the other product (its domain, names, URLs, secrets).
- Show me the CLAUDE.md, with a short list of every conflict and how you resolved it, before
  writing any code.

=====

# Kachuful API: working notes

Backend for the Kachuful scorekeeper PWA (https://play.vectanix.com). Invite-only accounts, sync of
games played offline, a global player registry, leaderboards, stats, achievements, live and recap
links. The plan is `plan-backend.md`; §6 is the API contract shared with the app and is frozen.

## Stack: what this is NOT

**Python 3.12 (uv) + FastAPI + Pydantic v2 + SQLAlchemy 2 async/asyncpg + Alembic + PostgreSQL 16
(citext, pg_trgm) + argon2-cffi + pytest/httpx + ruff + mypy --strict.** Pillow and segno for
images and QR codes. No Django, no Flask, no GraphQL, no Redis, no Celery or task queue (jobs are
CLI commands run by systemd timers), no second ORM, no ORM magic in the domain.

## Commands: uv only

`uv run ruff check .` · `uv run ruff format --check .` · `uv run mypy app` · `uv run pytest`
`make verify` runs all four. `make dev` starts Postgres (Docker Compose) and uvicorn with reload.
`uv run alembic upgrade head` · `uv run python -m app.cli <command>`

## Project structure

```
app/
  main.py           app factory: routers, middleware, error handlers
  settings.py       the only place that reads environment variables (typed, validated at startup)
  api/              routers only, one module per resource: auth, admin, players, games, boards,
                    public, pages, health. Parse input, call a service, return a schema.
  schemas/          Pydantic request/response models, one module per resource
  services/         use cases: transactions, permissions, orchestration. No FastAPI imports.
  repositories/     SQL queries, one module per aggregate. No business rules.
  domain/           pure rules: scoring, validation, derive, stats, leaderboard, achievements,
                    awards, seasons, wrapped. No I/O, no DB, no FastAPI. Frozen dataclasses.
  db/               models.py (tables), session.py (the only engine/pool creation)
  security/         passwords, tokens, sessions, CSRF, rate limits (the only crypto code)
  live/             LISTEN/NOTIFY fan-out and SSE streams
  render/           OG images and QR SVG
  jobs/             one module per CLI command (auto_end, close_day, close_season, prune, backup,
                    seed_admin, seed_demo, seed_load)
  cli.py            `python -m app.cli <command>`
alembic/            migrations
tests/              mirrors app/: domain/, services/, api/, perf/; fixtures/ (golden, from the app);
                    factories.py; conftest.py
deploy/             nginx snippet, systemd units and timers, env example
assets/fonts/       fonts for OG images
```

Imports only flow downwards: `api → services → repositories / domain / security`. `domain` imports
nothing from `app`. `repositories` never import `services`.

## Reuse before you write

| Need                      | Use                                                      |
| ------------------------- | -------------------------------------------------------- |
| Game rules, scores, stats | `app/domain` (pure; parity proven by golden fixtures)    |
| Errors to clients         | `ApiError(status, code, message, **extra)`               |
| Time conversion           | `app/domain/time.py` (epoch ms ⇄ aware UTC; APP_TZ days) |
| Name uniqueness           | `domain.names.name_key()`                                |
| Settings                  | `app.settings.settings`                                  |

## Naming

- Modules and functions `snake_case` (functions are verbs: `derive_game`, `rank_rows`); classes
  `PascalCase`; constants `UPPER_SNAKE`; private helpers start with `_`.
- **JSON is camelCase.** Pydantic models use `alias_generator=to_camel, populate_by_name=True`.
  Python stays snake_case. Times on the wire are epoch milliseconds; ids are UUID strings.
- **Error codes** are `snake_case` and listed in the contract (`name_taken`, `stale`, `weak_password`).
- **Routes** are plural nouns, with kebab-case for multi-word segments (`/reset-link`), and no verbs
  except the actions the contract names.
- **Database:**
  - Tables are plural `snake_case`; columns `snake_case`.
  - Timestamps are `*_at timestamptz`; foreign keys `<thing>_id`.
  - Constraint names: `pk_`, `fk_<table>_<col>`, `uq_<table>_<cols>`, `ix_<table>_<cols>`.
  - Alembic messages are imperative: "add player_day rollup".
- **Tests:** `test_<unit>.py`, and test names state the behaviour:
  `test_upload_with_older_rev_returns_stale`.

## Code rules

- Type hints everywhere. `mypy --strict` passes. `Any` is allowed only at the JSON boundary.
- Async for all I/O. Never block the event loop: CPU-heavy work (OG images) runs in a thread pool.
- All SQL goes through SQLAlchemy with bound parameters. A fixed number of queries per request: no
  N+1, so eager-load or use one query.
- **Every hot-path query has an index**, plus a test running `EXPLAIN` that asserts it is used. List
  endpoints never read `games.payload`.
- Derived data is written on upload (`round_scores`, `game_players`, `player_day`, `games.summary`),
  never computed on read.
- One `ApiError` handler: no stack traces or SQL in responses.
- Logs are structured JSON, never passwords, tokens or cookies; no `print`.
- **Comments: 1–3 lines**, non-obvious _why_ only. One-line docstrings on public functions. No
  section banners and no commented-out code.
- **No temporary fixes.** Fix the root cause or say where the fix belongs.

## Rules

- **Contract:** `plan-backend.md` §6 is frozen. If it's wrong or missing something, stop and tell
  Jay; never change it silently. Every route declares `response_model`.
- **Parity:** the app's TypeScript `src/domain` is the reference. Golden fixtures in
  `tests/fixtures/` must all pass. Never edit a fixture to make a test pass; report the mismatch.
- **Game rules and scoring** never change without a failing test first.
- **Migrations:** one per change. Never edit an applied migration. Data migrations are separate from
  schema ones. Each one is reversible or has a written rollback note.
- **Security:** argon2id; tokens are random 32 bytes stored only as SHA-256; cookie `kf_session`
  (HttpOnly, Secure, SameSite=Lax); `X-Kachuful: 1` + `Origin` on every non-GET; rate limits as the
  plan says. Public endpoints never expose emails, user ids or first/last names.
- **Password rule:** at least 3 characters, no whitespace, at most 128. Nothing else.
- **No new dependency** beyond the stack above without asking Jay first.
- **Tests:** every endpoint has tests for the happy path, every error code and every permission rule,
  run against a real Postgres (transaction per test; never mock the DB). Domain tests come before
  domain code. Aim for at least 90% coverage on `domain/` and `services/`.
- **Performance budgets** are in `plan-backend.md` §15; `tests/perf` must stay under them.
- **Git:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`), one
  concern each, never a refactor mixed with a behaviour change, **no co-author trailer**. Never push,
  deploy, or touch CI secrets or production unless Jay asks.
- If a change touches more than about 3 files, outline the plan first.
- **Definition of done:** `make verify` is green, the migration is applied on staging, `HANDOFF.md`
  is updated, and anything stubbed, mocked or unverified is said plainly.
  \=====

STEP 2: Read plan-backend.md completely. It is the agreed plan:

- §2 decisions are final; don't reopen them without asking me.
- §6 is the API contract. It is frozen: if something looks wrong or missing, stop and tell me,
  because the app is being built against it right now.
- §7–§8 are the game rules and achievements to port to Python. Parity is proven by golden
  fixtures the app repo will export (§12.1). Until they arrive, write fixtures by hand from the
  plan and say they are hand-written.
- §15 is performance: every index, rollup and cache there is required, not optional. Quick
  responses are a feature.
- §16 is the handoff. Start HANDOFF.md at B1, update it at the end of every milestone, and finish
  it at B10 so the frontend can verify everything against staging without reading this code.
  Tell me when it's complete.

The only seeded user is the admin jaydhakan11@gmail.com (role admin, no password; `seed-admin`
prints an invite link to set it). There is no sign-up anywhere.

Work through the milestones in §13 in order, starting with B0. For each one: outline what you'll
do, build it with tests, run `make verify`, update HANDOFF.md, and stop for my review before the
next milestone.

Start with step 1 (show me the CLAUDE.md and the conflict list), then tell me your B0 outline and
any questions about the plan.
