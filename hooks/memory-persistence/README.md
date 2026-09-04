# Memory Persistence Hooks

Context does not survive a session boundary or a compaction. These three hooks
make the part that matters survive anyway.

| Event | Script | Role |
| --- | --- | --- |
| `SessionStart` | [`../../scripts/hooks/session-start.js`](../../scripts/hooks/session-start.js) | Read state back into context |
| `SessionEnd` | [`../../scripts/hooks/session-end.js`](../../scripts/hooks/session-end.js) | Snapshot on exit |
| `PreCompact` | [`../../scripts/hooks/pre-compact.js`](../../scripts/hooks/pre-compact.js) | Safety net before summarization |

## The cycle

```
session N                          session N+1
──────────────────────────────     ──────────────────────────────
 work                               SessionStart hook
   │                                  │ reads session-state.json
 /checkpoint ──▶ session-state.json ──┤ reads learned-patterns.md
   │                                  │ reads git branch + status
 /learn ──────▶ learned-patterns.md ──┤ reads package manager
   │                                  ▼
 PreCompact hook ──▶ snapshot       injected as additionalContext
   │
 SessionEnd hook ──▶ snapshot
```

## What is stored

`.claude/memory/session-state.json`

```json
{
  "updatedAt": "2026-09-04T12:00:00.000Z",
  "branch": "feat/cursor-pagination",
  "goal": "Orders list paginates by cursor with no duplicate rows under writes",
  "decisions": [{ "decision": "cursor on (created_at, id)", "why": "created_at is not unique" }],
  "rejected": [{ "option": "offset pagination", "why": "drifts under concurrent inserts" }],
  "state": {
    "committed": ["migration + index"],
    "uncommitted": ["src/orders/list.ts"],
    "verified": ["unit tests green", "typecheck green"]
  },
  "nextAction": "Add the boundary test for a page ending exactly on a duplicate created_at",
  "blockers": [],
  "facts": ["Seed script no-ops silently if migrations have not run"]
}
```

`learned-patterns.md` holds durable lessons by category. `session-log.md` holds
one line per session. All of it lives under `<project>/.claude/memory/` and
belongs in `.gitignore`.

## Merge, do not overwrite

`SessionEnd` and `PreCompact` **merge** into an existing checkpoint. A rich
checkpoint written by `/checkpoint` is never clobbered by an automatic snapshot —
the snapshot only refreshes `branch`, `lastCommit`, `updatedAt` and the
uncommitted file list.

## Failure behavior

If the memory directory cannot be written, the hook reports on stderr and exits
0. A session must never fail to start because a checkpoint could not be read, or
fail to end because one could not be written.
