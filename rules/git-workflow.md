# Rule: Git Workflow

## Branches

- Never commit directly to the default branch
- `<type>/<short-description>` — `feat/cursor-pagination`,
  `fix/auth-tenant-leak`, `chore/drop-legacy-seed`
- One logical change per branch. If the branch name needs "and", it is two
  branches

## Commits

Conventional Commits:

```
<type>(<scope>): <subject>

<body — why, not what>

<footer — refs, breaking changes>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`,
`ci`, `chore`, `revert`.

- Subject: imperative mood, lower case, no trailing period, ≤ 72 characters.
  "add cursor pagination", not "added" or "adds"
- Body: the reason for the change and the context a reviewer lacks. Wrap at 72
- `BREAKING CHANGE:` in the footer, with the migration path

**Atomic commits.** Each one builds and passes tests on its own. Do not mix a
refactor with a behavior change — the diff becomes unreviewable and the revert
becomes impossible.

## Before committing

```bash
git diff --staged        # read your own diff
<pm> run lint
<pm> run typecheck
<pm> test
```

Read the staged diff before every commit. Debug statements, stray files, and
committed secrets are all caught here or not at all.

- Never `git add -A` without reading what it picked up
- Never commit `.env`, credentials, or build output
- Never `--no-verify` past a failing hook

## Pull requests

- Title in the same format as a commit subject
- Body: what changed, why, how it was verified, and anything reviewers should
  look at closely
- Link the issue
- Keep them small. A 2000-line PR gets rubber-stamped, which is the same as not
  being reviewed
- CI green before requesting review
- Self-review the diff on the PR page first

## History

- Never force-push a shared branch. Never rewrite history someone else may have
  pulled
- On your own branch, rebase to tidy before review is fine; after review has
  started, prefer additional commits so reviewers can see what changed
- Revert with `git revert`, not by force-pushing the mistake away
