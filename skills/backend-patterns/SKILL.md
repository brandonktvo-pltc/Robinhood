---
name: backend-patterns
description: Patterns for API design, database access, transactions, caching, background jobs, and observability. Use when building or reviewing server-side code, designing endpoints, writing queries, or adding a cache or queue.
---

# Backend Patterns

## API design

**Resource-shaped URLs, verbs in the method.**
`GET /orders/{id}`, `POST /orders`, `PATCH /orders/{id}` — not `/getOrder`.

**Status codes mean things.** 200 success, 201 created (with `Location`),
204 no content, 400 malformed, 401 unauthenticated, 403 authenticated but not
permitted, 404 not found *or* not permitted to know, 409 conflict, 422 valid
shape but invalid content, 429 rate limited, 5xx your fault.

**One error envelope, everywhere.**
```json
{ "error": { "code": "ORDER_NOT_FOUND", "message": "...", "details": {} } }
```
`code` is stable and machine-readable. `message` is for humans and may change.
Never leak stack traces or SQL to a client.

**Validate at the edge.** A schema validator (zod, pydantic, go-playground) at
the handler boundary. The handler body works with parsed, typed values only.

**Version from day one.** `/v1/` in the path or a version header. Adding it
later is a migration; having it is free.

**Pagination is cursor-based** for anything that can grow. Offset pagination
drifts under concurrent writes and degrades on deep pages.

**Idempotency on unsafe operations.** An `Idempotency-Key` header on POST for
anything that charges money, sends a message, or provisions a resource.

## Database

**Parameterized queries only.** No string interpolation into SQL, ever, under
any deadline.

**Index what you filter, join, and sort on.** Then verify with `EXPLAIN
ANALYZE` on realistic data volumes. An index nobody uses is write cost with no
read benefit.

**Kill N+1 at the source.** Load the collection, then load the related rows in
one batched query keyed by id. In an ORM this is `include`/`joinedload`/
`Preload` — but confirm the generated SQL rather than trusting it.

**Transactions wrap invariants, not convenience.** A transaction should span
exactly the set of writes that must succeed or fail together. Keep them short;
never hold one open across a network call to a third party.

**Migrations are forward-only and reversible in principle.** Every migration
has a tested rollback path. Expand/contract for anything with live traffic:
add the new column, backfill, dual-write, switch reads, then drop the old one —
in separate deploys.

**Soft deletes need a reason.** They complicate every query and every unique
constraint. Use them when you genuinely need recovery or audit; otherwise
delete and rely on backups.

**Connection pooling sized to the database, not the app.** Every replica
multiplying its pool size is how you exhaust `max_connections`.

## Caching

**Cache-aside is the default.** Read: check cache, miss → load → populate →
return. Write: update the source of truth, then invalidate the key.

**Every cache entry has a TTL.** Unbounded caches become correctness bugs and
memory leaks.

**Key structure is a contract.** `v1:user:{id}:profile`. The version prefix lets
you invalidate a whole shape at once by bumping it.

**Guard the stampede.** On a hot-key miss, a single-flight lock or probabilistic
early expiry prevents every request rebuilding the same value at once.

**Do not cache what you cannot invalidate correctly.** Stale authorization data
is a security bug.

## Background work

- The queue is the boundary. The handler enqueues and returns; the worker does
  the work.
- **Jobs must be idempotent.** At-least-once delivery is the norm; assume
  redelivery.
- Bounded retries with exponential backoff and jitter, then a dead-letter queue.
  Infinite retry is an outage amplifier.
- The payload carries ids, not entities. Load fresh state in the worker.
- Every job has a timeout.

## Observability

- **Structured logs.** JSON, with a request id propagated through every layer.
  Never log secrets, tokens, or PII.
- **Three signals per endpoint:** rate, error rate, duration (p50/p95/p99).
- **Health checks distinguish liveness from readiness.** Readiness checks the
  dependencies; liveness only checks the process.
- Trace context propagated across service boundaries.
