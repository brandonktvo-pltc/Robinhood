---
description: Find and remove dead code, unused exports, and stale dependencies
argument-hint: [optional: path or module to scope the cleanup]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Task
---

# /refactor-clean

Cleanup scope: **$ARGUMENTS** (empty means the whole project)

## Baseline

- Working tree: !`git status --short 2>/dev/null | head -20 || echo "(clean)"`

## Instructions

Delegate to the `refactor-cleaner` agent. **Behavior-preserving only.**

1. **Baseline first** — run tests, typecheck and lint, and record the results.
   Do not start a cleanup on a red baseline.
2. **Detect** with the project's tooling (`knip`, `ts-prune`, `depcheck`) plus
   manual `grep` verification of each candidate.
3. **Rule out** dynamic references, public API surface, framework conventions
   (routing, migrations, fixtures, mocks), and build- or CI-only usage. Anything
   matching these is not dead — leave it and list it.
4. **Remove in small batches by category**, re-running the full suite after each.
   If a batch goes red, revert that batch rather than fixing forward.
5. **Report** what was removed, what was kept and why, and the before/after
   suite results.

Never remove a test to make a cleanup pass. Never bundle a behavior change into
a cleanup.
