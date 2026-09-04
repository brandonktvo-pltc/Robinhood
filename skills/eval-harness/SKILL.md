---
name: eval-harness
description: Build and run evaluations that measure whether a change to prompts, agents, skills or the verification loop actually improved things. Use when tuning an agent or skill, or when a subjective "this feels better" claim needs a number behind it.
---

# Eval Harness

Changes to prompts and agent instructions are unfalsifiable by default. An eval
turns "this feels better" into a number you can be wrong about.

## When you need one

- Tuning an agent or skill definition
- Changing a hook that alters behavior
- Comparing two approaches where both look plausible
- Any claim of the form "this made it better"

You do not need one for a deterministic code change — that is what tests are for.

## Anatomy

```
evals/
  cases/
    001-simple-refactor.json
    002-ambiguous-request.json
    ...
  run.js            # executes each case, collects output
  grade.js          # applies the rubric
  results/
    2026-09-04-baseline.json
    2026-09-04-variant-a.json
```

A case:

```json
{
  "id": "002-ambiguous-request",
  "input": "make the login faster",
  "setup": "fixtures/login-app",
  "expect": {
    "must": ["asks which metric, or states an assumption before acting"],
    "must_not": ["rewrites the auth provider without being asked"]
  }
}
```

## Designing the case set

- **15 to 30 cases minimum.** Below that, run-to-run variance swamps the effect
  you are measuring.
- **Cover the distribution**, not just the happy path: ambiguous requests,
  requests that should be refused or clarified, requests that should be a
  one-liner, requests that need a plan.
- **Include cases the current version fails.** A suite that already scores 100%
  cannot show improvement.
- **Freeze the case set** before running the variant. Editing cases after seeing
  results is how you fool yourself.

## Grading

Rubrics in order of preference:

1. **Deterministic** — did the test suite pass, did the file contain X, did the
   command exit 0. Cheap, exact, no drift. Use wherever possible.
2. **Structured checks** — regex or AST assertions on the output.
3. **Model-graded** — a rubric applied by a model. Necessary for judgment calls.
   Grade blind: the grader must not know which variant produced which output.

Report per-case results, not just an aggregate. An average that moved from 72%
to 78% while three previously-passing cases regressed is not an improvement.

## Running honestly

- **Baseline first**, on the unchanged version, same day, same conditions.
- **Three runs minimum per variant.** Report the spread, not just the mean.
  Non-determinism is real and it is larger than most improvements.
- **One variable at a time.** Changing the agent prompt and the hook together
  tells you nothing about either.
- **Report regressions.** A variant that improves the average while breaking a
  case that used to work is a tradeoff decision, not a win.

## Interpreting

- A difference smaller than the run-to-run spread is noise. Say so.
- Look at the failures individually. The aggregate hides the useful information.
- If a variant wins on the eval but feels worse in use, the eval is missing a
  case. Add it.
