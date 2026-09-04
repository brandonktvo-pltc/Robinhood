---
description: Produce a step-by-step implementation plan without writing code
argument-hint: [feature or change to plan]
allowed-tools: Read, Grep, Glob, Bash, WebFetch, Task
---

# /plan

Plan the implementation of: **$ARGUMENTS**

## Repository context

- Branch: !`git branch --show-current 2>/dev/null || echo "(not a git repo)"`
- Recent commits: !`git log --oneline -8 2>/dev/null || echo "(none)"`

## Instructions

Delegate to the `planner` agent.

Before planning, read the files this will actually touch — the plan must cite
real paths and real symbols, not an imagined structure. Find the existing
pattern in this codebase for a similar problem and follow it; introducing a new
pattern requires a stated reason.

Return:

- **Goal** — one sentence describing what is true when this is done
- **Files** — each path, whether it is new, and what changes
- **Steps** — ordered by dependency, each ending in a concrete verification
- **Risks** — what could break and how far it reaches
- **Out of scope** — what this deliberately does not do

No implementation code beyond signatures and type shapes. If the request is
ambiguous in a way that materially changes the plan, state the assumption at the
top and continue rather than stalling.
