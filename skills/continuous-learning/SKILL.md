---
name: continuous-learning
description: Extract durable patterns, conventions and gotchas from a working session and write them into project memory so the next session starts informed. Use at the end of a session, after solving a non-obvious problem, or when the user runs /learn.
---

# Continuous Learning

A session ends and everything learned in it evaporates. This skill captures the
part that is worth keeping.

## What qualifies

Capture something only if it is **durable**, **non-obvious**, and **reusable**.

| Capture | Skip |
| --- | --- |
| "Migrations must run before `db:seed` or the seed silently no-ops" | "Fixed a typo in `user.ts`" |
| "This repo uses pnpm; npm install corrupts the workspace links" | "Ran the test suite" |
| "`AuthGuard` reads the tenant from the subdomain, not the JWT" | "Added a console.log" |
| "Vitest needs `--pool=forks` here or the DB tests deadlock" | "Renamed a variable" |

Three tests, all of which must pass:

1. **Durable** — still true next month.
2. **Non-obvious** — not derivable in ten seconds from reading the file.
3. **Reusable** — it will change what someone does, not just what they know.

## Categories

- **Architecture** — module boundaries, data flow, why a thing lives where it does
- **Conventions** — naming, file layout, error handling patterns this repo uses
- **Gotchas** — the trap, and the symptom you see when you hit it
- **Tooling** — commands, flags, ordering constraints, environment requirements
- **Decisions** — a choice made and the reasoning, so it is not relitigated

## Where it goes

```
.claude/memory/learned-patterns.md
```

Format — newest entries appended under their category:

```markdown
## Gotchas

### Seed script requires migrations first
`db:seed` exits 0 without inserting anything if the schema is behind.
Symptom: empty tables, no error. Run `db:migrate` first.
_Learned 2026-09-04 · scripts/seed.ts_
```

Promote anything that becomes universally true for the project into `CLAUDE.md`.
`learned-patterns.md` is the working set; `CLAUDE.md` is the settled part.

## Process

1. Review the session: what was tried and rejected, what surprised you, what
   took more than one attempt.
2. Filter through the three tests above. Most sessions yield zero to three
   entries. Zero is a legitimate answer — do not manufacture entries.
3. Check for an existing entry on the same topic. Update it rather than
   appending a near-duplicate.
4. Write in the imperative, with the symptom included where there is one. An
   entry that says only "be careful with X" is not usable.
5. Include the date and the relevant file path.

## Anti-patterns

- Recording the session narrative instead of the lesson
- Recording anything already in the README
- Recording a preference as though it were a constraint
- Letting the file grow unbounded — prune entries that stop being true
