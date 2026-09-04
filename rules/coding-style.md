# Rule: Coding Style

## Immutability

- `const` by default. `let` only where reassignment is real. Never `var`
- **Never mutate a caller's argument.** Return a new value
- Spread or structured copies for updates; `Object.freeze` on shared constants
- Pure functions where possible: same input, same output, no side effects.
  Push side effects to the edges

## Naming

- Names carry meaning. `userIdsAwaitingApproval`, not `arr2`, not `data`
- Booleans read as predicates: `isActive`, `hasPermission`, `canRetry`
- Functions are verb phrases: `parseDuration`, `resolveTenant`
- No abbreviations beyond established domain terms
- A name that needs a comment to explain it is the wrong name

## Functions

- One thing, at one level of abstraction. A function that both decides and
  performs is two functions
- Early return over nested conditionals. Guard clauses at the top
- Three or more parameters become an options object
- Default to short. A long function is not automatically wrong, but it needs a
  reason

## Errors

- Every failure path is handled or deliberately propagated
- `catch {}` with an empty body is a bug. So is catching, logging, and
  continuing as though nothing happened
- Specific error types. Wrap with context when re-throwing
- Never swallow an error to make a test pass

## Types

- **No `any`.** `unknown` and narrow. Fix wrong third-party types in a `.d.ts`
  augmentation, not with a cast
- `strict: true` and its equivalents. Types on every public signature
- Discriminated unions over optional-field soup

## Files and modules

- One concept per file. Past ~300 lines it is usually two concepts
- Named exports. Default exports break rename-refactoring and auto-import
- Colocate: implementation, its types, its tests
- Import order: standard library, third-party, internal absolute, relative —
  blank line between groups
- `index.ts` re-exports the public surface and contains no logic

## Comments

- Explain **why**, not what. The constraint, the bug being worked around, the
  spec being implemented
- No commented-out code. That is what version control is for
- No `TODO` without an owner or an issue reference
- Delete a comment that has stopped being true — a stale comment is worse than
  none

## Formatting

Delegated to the formatter (`prettier`, `ruff format`, `gofmt`). Never argue
about it in review, never hand-format against it.
