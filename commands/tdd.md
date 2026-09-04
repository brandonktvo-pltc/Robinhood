---
description: Implement a feature test-first using strict red-green-refactor cycles
argument-hint: [feature or behavior to implement]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Task
---

# /tdd

Implement the following test-first: **$ARGUMENTS**

## Current state

- Branch: !`git branch --show-current 2>/dev/null || echo "(not a git repo)"`
- Working tree: !`git status --short 2>/dev/null | head -20 || echo "(none)"`

## Instructions

Use the `tdd-guide` agent and follow the `tdd-workflow` skill.

1. **Establish the baseline.** Find the test command and run the existing suite.
   If it is already red, stop and report that — do not build on a broken
   baseline.
2. **List the behaviors** to implement, smallest first. Show the list before
   starting.
3. **Cycle, one behavior at a time:**
   - RED — write one failing test, run it, show the failure
   - GREEN — minimum code to pass, run it, show it pass
   - REFACTOR — clean up with tests green, re-run
4. **Report each cycle** in three lines (RED / GREEN / REFAC).
5. **Finish** with the full suite output and a coverage figure for the changed
   files.

Do not write implementation code before a failing test demands it. Do not write
more than one failing test at a time. Do not claim a test passes without running
it.
