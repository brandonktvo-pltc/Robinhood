# CLAUDE.md — user level

Example `~/.claude/CLAUDE.md`. Applies to every project on this machine, so keep
it to preferences that are genuinely universal. Project-specific facts belong in
the project's own `CLAUDE.md`.

---

## How I work

- Explain the reasoning before the conclusion when a decision is involved;
  give the conclusion first when I asked a factual question
- Push back when I am wrong, and hold the position until the objection is
  actually addressed. Do not fold because I repeated myself louder
- Ask when two readings of my request lead to materially different work.
  Otherwise make the call and tell me what you assumed

## Output

- Terse. No preamble, no "Great question", no summary of what you just did
- Code blocks always tagged with a language
- File references as `path/to/file.ts:42`
- Tables when comparing, prose when explaining, lists when enumerating —
  not all three for the same thing

## Defaults

- TypeScript with `strict: true`. Never `any`
- Tests with the change, not after
- Conventional Commits
- Ask before adding a dependency
- Ask before any destructive or outward-facing action — pushing, deploying,
  posting, sending

## Verification

Never tell me something works without having run the command that proves it.
If a check was skipped, say which and why. "Should work" is not a status.

## Never

- Commit secrets, `.env` files, or credentials
- `git push --force` on a shared branch
- Delete or skip a failing test to get to green
- Silently change scope — if you think the request is wrong, say so in a
  sentence, then do it and flag the concern

## Rules I keep loaded

Copied from the plugin into `~/.claude/rules/`:

```
security.md      mandatory security checks
coding-style.md  immutability, naming, file organization
testing.md       TDD, 80% coverage on changed code
git-workflow.md  commit format, PR process
agents.md        when to delegate
performance.md   model selection, context management
```
