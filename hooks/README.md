# Hooks

All hook wiring lives in [`hooks.json`](./hooks.json). The implementations are
cross-platform Node.js scripts under [`../scripts/hooks/`](../scripts/hooks/),
invoked as `node "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/<name>.js"` so they work
identically on Linux, macOS and Windows.

| Event | Script | What it does |
| --- | --- | --- |
| `SessionStart` | `session-start.js` | Reloads the checkpoint, learned patterns, git state and package manager into context |
| `SessionEnd` | `session-end.js` | Merges a git snapshot into the checkpoint and appends to the session log |
| `PreCompact` | `pre-compact.js` | Writes a safety-net checkpoint and tells the summarizer what must survive |
| `PostToolUse` | `suggest-compact.js` | Tracks session volume and suggests compacting once per threshold |
| `Stop` | `evaluate-session.js` | Queues the session for pattern extraction and suggests `/learn` |

Grouped documentation:

- [`memory-persistence/`](./memory-persistence/) — the session lifecycle hooks
- [`strategic-compact/`](./strategic-compact/) — the compaction suggestion hook

## Design rules these follow

- **Never block the session.** Every script is wrapped in `runHook()`, which
  reports errors on stderr and still exits 0.
- **Never crash on bad input.** `readHookInput()` resolves to `{}` on empty,
  closed, or malformed stdin, and times out after 2 seconds.
- **Suggest, do not decide.** The compaction and learning hooks emit a
  `systemMessage` and stop there.
- **Bounded state.** Tracker files prune themselves rather than growing forever.

## State written

All under `<project>/.claude/memory/` — add it to `.gitignore`.

```
session-state.json      the checkpoint: goal, decisions, next action, blockers
learned-patterns.md     durable lessons (written by /learn)
session-log.md          one line per session
pending-learnings.md    sessions queued for mining
compact-tracker.json    per-session tool counts and which nudges have fired
evaluated-sessions.json marker file so a session is only queued once
```

## Adding a PreToolUse guard

`hooks.json` ships without one. To add a guard that blocks a tool call before it
runs, add an entry and exit `2` from the script to deny with the stderr text as
the reason:

```json
"PreToolUse": [
  {
    "matcher": "Bash",
    "hooks": [
      { "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/hooks/guard.js\"", "timeout": 5 }
    ]
  }
]
```

Matchers are tool names (`Bash`, `Edit`, `Write`) or a regex across them
(`Edit|Write`). `*` matches everything.

## Testing a hook by hand

Hooks read JSON on stdin and write JSON on stdout:

```bash
echo '{"session_id":"test","cwd":"'"$PWD"'","source":"startup"}' \
  | node scripts/hooks/session-start.js
```

The plugin's own suite covers them:

```bash
node tests/run-all.js
```
