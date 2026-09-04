---
name: strategic-compact
description: Decide when to compact a long session and what to preserve across the boundary. Use when context is filling up, before starting a distinct new phase of work, or when the model starts re-reading files it already read.
---

# Strategic Compact

Compaction is lossy. Doing it at a good moment costs almost nothing; doing it
mid-task loses the state you needed.

## Compact at a seam, not mid-stride

**Good moments**
- A feature is complete and tests are green
- A debugging session ended with the cause identified
- Switching from exploration to implementation, or implementation to review
- A long research phase concluded with a decision

**Bad moments**
- Mid-refactor with files half-edited
- Mid-debugging with hypotheses in flight and nothing yet confirmed
- With uncommitted work whose rationale exists only in the conversation
- While a background task is running whose output you will need to interpret

If you must compact at a bad moment, write the state down first — see below.

## Signals it is time

- Context usage past ~70%
- Re-reading files already read this session
- Losing track of decisions made earlier in the conversation
- The task at hand is unrelated to the first half of the conversation
- Repeating a question the user already answered

## What must survive

Before compacting, make sure these are captured somewhere durable — a file, a
commit message, or an explicit summary — because they will not survive on their
own:

1. **The goal** — what "done" looks like, in one sentence
2. **Decisions and their reasons** — especially options that were considered and
   rejected, so they are not reconsidered
3. **Current state** — files changed, what is committed, what is not
4. **The next action** — the specific next step, not a vague direction
5. **Blockers** — what is stuck and what it is waiting on
6. **Hard-won facts** — the command that works, the flag that matters, the
   gotcha that cost twenty minutes

## Workflow

```bash
# 1. Reach a stable point
git status
<pm> test

# 2. Persist state
/checkpoint            # writes .claude/memory/session-state.json

# 3. Capture lessons
/learn                 # appends to .claude/memory/learned-patterns.md

# 4. Commit if there is anything committable
git add -A && git commit -m "..."

# 5. Compact
/compact <focus for the summary>
```

The `SessionStart` hook reloads the checkpoint automatically on the next
session, and `PreCompact` writes one as a safety net if you forget.

## Choosing the compact focus

Pass a focus argument telling the summarizer what matters:

```
/compact keep the auth refactor decisions and the failing test list; drop the file exploration
```

Without a focus, the summary weights everything equally, which usually means
keeping file listings and dropping reasoning.
