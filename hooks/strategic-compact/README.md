# Strategic Compact Hook

A `PostToolUse` hook that watches session volume and suggests compacting at a
sensible moment. Implementation:
[`../../scripts/hooks/suggest-compact.js`](../../scripts/hooks/suggest-compact.js).

## Why a hook rather than a rule

By the time context pressure is obvious from the inside, detail has already been
lost — files get re-read, earlier decisions get relitigated, answered questions
get asked again. An external counter notices before that happens.

## Thresholds

Whichever signal crosses first wins, and each threshold fires **once** per
session.

| Threshold | Tool calls | Transcript bytes | Message |
| --- | --- | --- | --- |
| `tools-60` | 60 | 400 KB | early — compact if you are at a seam |
| `tools-120` | 120 | 900 KB | due — checkpoint, learn, then compact with a focus |
| `tools-200` | 200 | 1.6 MB | overdue — detail is likely already being lost |

Transcript size is read with `fs.statSync` on the `transcript_path` the hook
receives; it is skipped silently when unavailable.

## It suggests, it does not act

The hook emits a `systemMessage` and stops. It never compacts, never blocks a
tool call, and never interrupts. Compacting mid-refactor is worse than a large
context, so the decision stays with the user — see the `strategic-compact` skill
for when to accept the suggestion.

## State

`.claude/memory/compact-tracker.json`

```json
{
  "<session-id>": {
    "toolCalls": 137,
    "transcriptBytes": 942118,
    "notified": ["tools-60", "tools-120"],
    "updatedAt": "2026-09-04T12:00:00.000Z"
  }
}
```

Pruned to the 20 most recent sessions on every write, so it cannot grow
unbounded.

## Tuning

Edit `THRESHOLDS` in the script. Lower them for work with large file reads,
raise them for long sessions of small edits. To disable the nudging entirely,
remove the `PostToolUse` entry from [`../hooks.json`](../hooks.json) — the
`/checkpoint`, `/learn` and `/compact` workflow still works without it.
