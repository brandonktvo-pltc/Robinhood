# Contexts

Prompt fragments that shift how a session behaves. Each file is appended to the
system prompt for the duration of the work — they are modes, not documentation.

| File | Use when |
| --- | --- |
| [`dev.md`](./dev.md) | Implementing. Bias to action, verify every step |
| [`review.md`](./review.md) | Reviewing a diff. Adversarial, read-only, evidence required |
| [`research.md`](./research.md) | Exploring an unfamiliar codebase. Read-only, cite everything |

## Using one

Start a session in a mode:

```bash
claude --append-system-prompt "$(cat contexts/dev.md)"
```

Or reference one mid-session:

```
Follow contexts/review.md for this review.
```

Or wire one to a `SessionStart` hook to make it the default for a project:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "cat \"${CLAUDE_PLUGIN_ROOT}/contexts/dev.md\"" }
        ]
      }
    ]
  }
}
```

## Writing a new one

- **One posture per file.** A context that says "be thorough but also fast" says
  nothing
- **Constraints, not encouragement.** "Every claim cites a file and line" beats
  "be accurate"
- **State what not to do.** The prohibitions do more work than the instructions
- **Keep it short.** A context competes with the actual task for attention;
  anything past roughly a page starts costing more than it adds
