---
description: Extract durable patterns from this session into project memory
argument-hint: [optional: topic to focus the extraction on]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /learn

Focus: **$ARGUMENTS** (empty means the whole session)

## Existing memory

!`cat .claude/memory/learned-patterns.md 2>/dev/null | head -60 || echo "(no learned-patterns.md yet)"`

## Instructions

Follow the `continuous-learning` skill.

Review this session and extract only what passes all three tests:

1. **Durable** — still true next month
2. **Non-obvious** — not derivable in ten seconds from reading the file
3. **Reusable** — it changes what someone does, not just what they know

Categorize each entry as Architecture, Conventions, Gotchas, Tooling, or
Decisions. Append to `.claude/memory/learned-patterns.md` under its heading,
creating the file and directory if needed.

Each entry:

```markdown
### <short imperative title>
<the lesson, including the symptom if there is one>
_Learned <date> · <relevant file path>_
```

Check for an existing entry on the same topic and update it rather than
appending a near-duplicate. Prune entries that have stopped being true.

Most sessions yield zero to three entries. **Zero is a legitimate answer** —
report "nothing durable to capture" rather than manufacturing entries.

If something has become universally true for this project, propose promoting it
to `CLAUDE.md` rather than leaving it in the working set.
