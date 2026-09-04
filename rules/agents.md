# Rule: Agent Delegation

Subagents run in their own context window. Delegation is for isolating work
whose intermediate output you do not need to keep.

## Delegate when

- **The search is broad.** Sweeping many files or directories to answer one
  question — delegate, and keep the conclusion instead of the file dumps
- **The work is independent.** Several tasks with no dependency between them
  run in parallel
- **The output is a verdict, not a transcript.** Reviews, audits, research
- **The context cost is high and the answer is small.** Reading twenty files to
  produce a three-line answer

## Do not delegate when

- You already know the file, symbol, or value — search directly
- The task is a single edit
- You need the intermediate state to continue
- You have already delegated the same search — wait for it, do not also run it
  yourself

## Which agent

| Situation | Agent |
| --- | --- |
| Feature touching 3+ files, needs an execution plan | `planner` |
| "How should this be structured" | `architect` |
| Implementing test-first | `tdd-guide` |
| Finished a chunk of work, before commit | `code-reviewer` |
| Diff touches auth, input, secrets, I/O, network | `security-reviewer` |
| Build, typecheck or lint failing | `build-error-resolver` |
| Browser-level user flow to verify | `e2e-runner` |
| Dead code and unused dependencies | `refactor-cleaner` |
| Public API, config or setup steps changed | `doc-updater` |

## Writing the prompt

A subagent starts with no conversation history. Its prompt must be
self-sufficient:

- The goal, stated as an outcome
- The paths and symbols it needs, spelled out
- The constraints it must respect
- **The output format you expect**

A vague prompt produces a vague report, and you pay full context cost for it.

## Parallelism

Launch independent agents in a single message so they run concurrently. Do not
launch a second agent that depends on the first's result — wait.

## After a delegation

The agent's report is not shown to the user. **Relay what matters** in your own
words. Never fabricate or predict a pending agent's result — if it has not
returned, say it is still running.
