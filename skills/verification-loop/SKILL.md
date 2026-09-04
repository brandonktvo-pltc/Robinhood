---
name: verification-loop
description: The continuous verification discipline — never claim work is done without running the check that proves it. Use whenever making code changes, and before reporting completion of any task.
---

# Verification Loop

The rule: **a claim about the code is only as good as the command that proves
it.** "Should work" is not a status.

## The loop

```
CHANGE ──▶ VERIFY ──▶ [green] ──▶ next change
             │
          [red] ──▶ DIAGNOSE ──▶ FIX ──▶ VERIFY
```

Never stack a second change on an unverified first one. When two unverified
changes break something, you have doubled the search space for no reason.

## The verification ladder

Run from cheapest to most expensive. Stop and fix at the first red rung.

| Rung | Command | When |
| --- | --- | --- |
| 1 | format / lint | every file save |
| 2 | typecheck | every change to types or signatures |
| 3 | unit tests (changed scope) | every logical change |
| 4 | unit tests (full suite) | before commit |
| 5 | integration tests | before push |
| 6 | build | before push |
| 7 | E2E | before merge |

Establish the actual commands for the project once, and record them in
`CLAUDE.md` so every session uses the same ones.

## Standards of proof

**Paste real output.** Not a summary of the output. If a suite passes, the
counts are in the report. If it fails, the first real error is in the report.

**Prove the negative first on a bug fix.** Reproduce the failure, then apply the
fix, then show the same command passing. A fix without a reproduction is a
guess that happened to coincide with a passing run.

**A new test must fail before it passes.** Otherwise it is not testing the code
you just wrote.

**Check the whole suite, not just your test.** A change that fixes one test and
breaks two is a regression.

## Honest reporting

- Tests failed → say so, with the output.
- A step was skipped → say which, and why.
- Something is unverified → label it unverified. Do not round up to "done".
- A check could not be run (missing dependency, no credentials) → say so
  explicitly rather than silently omitting that rung.

Rounding "the typecheck passes" up to "this works" is the single most expensive
habit in this loop.

## Commands worth having on hand

```bash
git diff HEAD                    # what actually changed
git status --short               # what is untracked or staged
<pm> run lint
<pm> run typecheck
<pm> test
<pm> run build
```

Run `/verify` to execute the ladder and `/checkpoint` to record the result.
