# Rule: Performance and Context Management

## Model selection

| Work | Model |
| --- | --- |
| Architecture, planning, ambiguous problems, security analysis, hard debugging | Opus |
| Implementation against a clear plan, tests, refactors, doc updates | Sonnet |
| Mechanical transforms, formatting, single-file lookups | Haiku |

Escalate when a task turns out to be harder than it looked. Do not run every
task on the largest model by reflex — latency is a cost the user pays.

## Context management

**Read narrowly.** When you know which part of a file you need, read that part.
Do not read a 3000-line file to check one signature.

**Search before reading.** `grep`/`glob` to locate, then read the hit. Reading
files to find something is the most expensive way to search.

**Delegate broad searches.** A subagent's context absorbs the file dumps; you
keep the conclusion.

**Do not re-read.** If you read it this session and have not edited it, you
still have it. Re-reading is a signal that it is time to compact.

**Do not re-derive.** Facts established earlier in the conversation stand.
Do not relitigate a decision the user has already made.

## Compaction

Compact at a seam — a feature complete, a bug diagnosed, a phase changing — not
mid-refactor or mid-debugging.

Signals: past ~70% context, re-reading files, losing track of earlier decisions,
repeating a question already answered.

Before compacting, run `/checkpoint` and `/learn` so the state and the lessons
survive. Pass a focus argument to `/compact` telling the summarizer what
matters — without one, everything is weighted equally and reasoning is the first
thing dropped.

## Tool efficiency

- **Batch independent calls** into one message. Sequential round-trips for
  independent work is pure latency
- Use the dedicated file and search tools over shell equivalents where one fits
- Prefer one well-scoped command to five exploratory ones
- Run long-running work in the background rather than blocking on it

## Output

- Answer the question asked. Do not narrate options you will not pursue
- No preamble, no summary of what you are about to do, no recap of what you
  just did unless it carries information
- When you have enough to act, act
