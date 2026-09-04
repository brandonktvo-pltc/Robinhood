---
description: Save the current session state so it survives compaction or a restart
argument-hint: [optional: note to attach to the checkpoint]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /checkpoint

Note: **$ARGUMENTS**

## Current state

- Branch: !`git branch --show-current 2>/dev/null || echo "(not a git repo)"`
- Working tree: !`git status --short 2>/dev/null || echo "(clean)"`
- Last commits: !`git log --oneline -5 2>/dev/null || echo "(none)"`

## Instructions

Write `.claude/memory/session-state.json` (creating the directory if needed)
with this shape:

```json
{
  "updatedAt": "<ISO 8601 timestamp>",
  "branch": "<current branch>",
  "goal": "<what done looks like, one sentence>",
  "decisions": [
    { "decision": "<what was decided>", "why": "<the reason>" }
  ],
  "rejected": [
    { "option": "<what was considered>", "why": "<why it lost>" }
  ],
  "state": {
    "committed": ["<what is committed>"],
    "uncommitted": ["<what is changed but not committed>"],
    "verified": ["<checks that have been run and passed>"]
  },
  "nextAction": "<the specific next step>",
  "blockers": ["<what is stuck and what it waits on>"],
  "facts": ["<hard-won commands, flags, gotchas from this session>"],
  "note": "$ARGUMENTS"
}
```

Rules:

- `nextAction` must be a specific step, not a direction. "Add the `tenantId`
  check to `AuthGuard.canActivate`", not "continue the auth work".
- Record **rejected** options and why. Without them the next session
  relitigates settled decisions.
- Only list something under `verified` if the check was actually run.
- Merge with an existing checkpoint rather than overwriting facts that are still
  true.

The `SessionStart` hook reads this file back automatically at the start of the
next session.
