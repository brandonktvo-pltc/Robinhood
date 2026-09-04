# CLAUDE.md — project level

Example project configuration. Copy to the root of a project and edit every
line — a CLAUDE.md that describes a different project is worse than none.

Keep it short. This file is read on every session; anything that is not load-
bearing costs attention on every task.

---

# Acme Orders API

Order management service. Node 22, TypeScript, Fastify, PostgreSQL via Drizzle.

## Commands

```bash
pnpm install            # setup
pnpm dev                # local server on :3000
pnpm test               # vitest, unit + integration
pnpm test -- --coverage # coverage report
pnpm typecheck          # tsc --noEmit
pnpm lint               # eslint + prettier check
pnpm db:migrate         # apply migrations
pnpm db:seed            # seed local data — REQUIRES migrations to have run
```

**Package manager is pnpm.** `npm install` corrupts the workspace links.

## Architecture

```
src/
  routes/       Fastify route definitions — validation only, no logic
  services/     business logic — the only layer that composes repositories
  repositories/ database access — one per aggregate, no cross-aggregate joins
  db/           schema, migrations, connection
  lib/          shared utilities with no domain knowledge
```

Dependency direction is strictly `routes → services → repositories → db`.
A route never touches a repository directly.

## Conventions

- Zod schema at every route boundary; handlers work with parsed values only
- Errors as `AppError` subclasses; the error handler maps them to status codes
- Never construct SQL by hand — Drizzle query builder or parameterized `sql`
- Tests colocated as `*.test.ts`; integration tests use a real Postgres in
  Docker, never mocks of the repository layer

## Gotchas

- `db:seed` exits 0 without inserting anything if migrations have not run.
  Symptom: empty tables, no error
- `AuthGuard` reads the tenant from the subdomain, not the JWT. A request
  without a subdomain resolves to the default tenant
- Integration tests need `--pool=forks`; the default worker pool deadlocks on
  the shared connection

## Before committing

```bash
pnpm lint && pnpm typecheck && pnpm test
```

All three green. Never `--no-verify`.

## Do not

- Add a dependency without asking
- Change the migration history — always add a new migration
- Commit `.env`
