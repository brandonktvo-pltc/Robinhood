---
description: Diagnose and fix a failing build, typecheck, or lint run
argument-hint: [optional: the failing command or error text]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Task
---

# /build-fix

Failure context: **$ARGUMENTS**

## Project state

- Scripts: !`node -e "try{const p=require('./package.json');console.log(Object.keys(p.scripts||{}).join(', ')||'(none)')}catch(e){console.log('(no package.json)')}" 2>/dev/null`
- Changed files: !`git status --short 2>/dev/null | head -20 || echo "(none)"`

## Instructions

Delegate to the `build-error-resolver` agent.

1. **Reproduce.** Run the failing command and capture real output. Never work
   from a paraphrase.
2. **Read the first error, not the last** — compilers cascade.
3. **Trace to the root cause.** Where the error surfaced is often not where the
   mistake is.
4. **Fix minimally.** One logical fix per error class. No unrelated refactoring.
5. **Prove it.** Re-run the failing command and paste the passing output, then
   re-run the full check suite.

Forbidden: `any`, `@ts-ignore`, `# type: ignore`, `eslint-disable` or `# noqa`
used to silence rather than fix; deleting or skipping a failing test; pinning or
downgrading a dependency to dodge the error without a stated reason.
