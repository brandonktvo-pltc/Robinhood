---
description: Review the current diff for correctness, security, reuse and test gaps
argument-hint: [optional: branch, PR number, or path to scope the review]
allowed-tools: Read, Grep, Glob, Bash, Task
---

# /code-review

Review scope: **$ARGUMENTS** (empty means the uncommitted diff)

## The diff

- Status: !`git status --short 2>/dev/null || echo "(not a git repo)"`
- Stat: !`git diff HEAD --stat 2>/dev/null || echo "(no changes)"`

## Instructions

Run the `code-reviewer` agent. If the diff touches authentication,
authorization, user input handling, file I/O, subprocess execution, secrets, or
network calls, also run the `security-reviewer` agent — launch both in parallel.

Priority order: correctness → security → reuse → simplification → test gaps →
consistency.

**Verification bar:** before reporting a finding, construct a concrete failure —
specific inputs or state producing a specific wrong result. If you cannot, drop
the finding or mark it explicitly as a question.

Report grouped by severity (**Blocker** / **Major** / **Minor**), each with file
and line, the failure scenario, and the specific fix. No style nits the linter
already handles. If the diff is clean, say so in one line — do not manufacture
findings.

Report only. Do not edit files.
