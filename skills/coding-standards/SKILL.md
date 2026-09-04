---
name: coding-standards
description: Language-level best practices for TypeScript, JavaScript, Python and Go — naming, error handling, immutability, module boundaries, and type discipline. Use when writing new code, reviewing a diff for quality, or deciding how to structure a module.
---

# Coding Standards

Cross-cutting rules first, then per-language specifics.

## Universal

**Names carry meaning.** `userIdsAwaitingApproval`, not `arr2`. A name that
needs a comment to explain it is the wrong name. Booleans read as predicates:
`isActive`, `hasPermission`, `canRetry`.

**Functions do one thing at one level of abstraction.** A function that both
decides and performs is two functions.

**Errors are values, not surprises.** Every failure path is either handled or
deliberately propagated. `catch {}` with an empty body is a bug. `catch (e) { log(e) }`
that then continues as if nothing happened is a worse bug.

**Fail fast at the boundary, be forgiving inside.** Validate once, at the edge,
then trust your own types.

**Immutability by default.** Mutate only when you own the value and the mutation
is local. Never mutate a caller's argument.

**No magic values.** Named constants, at the top of the module or in a shared
constants file.

**Comments explain why.** What the code does is the code's job. Why it does it
this way — the constraint, the bug it works around, the spec it implements — is
the comment's job.

## TypeScript / JavaScript

- `strict: true`. Non-negotiable. `noUncheckedIndexedAccess` on for new projects.
- **Never `any`.** Use `unknown` and narrow. When a third-party type is wrong,
  fix it in a `.d.ts` augmentation, not with a cast.
- **Prefer `type` for unions and function shapes, `interface` for object
  contracts that may be extended.** Consistency inside a file matters more than
  the rule.
- **Discriminated unions over optional-field soup.**
  ```ts
  type Result<T> =
    | { ok: true; value: T }
    | { ok: false; error: Error };
  ```
- `const` by default, `let` when reassignment is real, never `var`.
- `async`/`await` over `.then` chains. Every promise is awaited or explicitly
  passed on — a floating promise is an unhandled rejection waiting to happen.
- Array methods over index loops when the intent is map/filter/reduce; a plain
  `for` loop when you need early exit or index arithmetic.
- Named exports. Default exports break rename-refactoring and auto-import.
- Module boundary: one concept per file. When a file grows past ~300 lines,
  it is usually two concepts.

## Python

- Type hints on every public function signature. `mypy --strict` or `pyright` in CI.
- Dataclasses or Pydantic models for structured data. Never a bare dict passed
  between layers.
- `pathlib.Path`, not string paths. `f`-strings, not `%` or `.format`.
- Context managers for anything with a lifecycle.
- Specific exception types. `except Exception:` only at a top-level boundary
  where you log and re-raise or convert.
- Prefer comprehensions when they stay on one line and read cleanly; a loop
  when they do not.
- `ruff` for lint and format. `__all__` on modules with a public surface.

## Go

- Handle every error at the call site. `if err != nil` immediately, no deferred
  regret. Wrap with context: `fmt.Errorf("loading config: %w", err)`.
- Accept interfaces, return structs.
- Small interfaces, defined by the consumer, not the producer.
- `context.Context` as the first parameter on anything that does I/O.
- `defer` for cleanup, immediately after successful acquisition.
- No naked returns in functions longer than a few lines.

## File organization

```
feature/
  index.ts          # public surface — re-exports only
  types.ts          # shared types for the feature
  <feature>.ts      # the implementation
  <feature>.test.ts # colocated tests
```

Imports ordered: standard library, third-party, internal absolute, relative.
A blank line between groups. Let the formatter enforce it.
