# everything-claude-code

A Claude Code plugin and its self-hosted marketplace. **No application code** —
the deliverable is the plugin itself: agents, skills, commands, rules, hooks,
and the dependency-free Node scripts behind the hooks.

**This repository is public.** No client, staff, entity or payment data belongs
here, in code, tests, fixtures or commit messages. Business material lives in
private repositories.

## Commands

```bash
node tests/run-all.js            # full suite — 90 cases across 6 files
node tests/run-all.js utils      # one suite, matched by name or path
claude plugin validate .         # schema check against the installed CLI
claude plugin details everything-claude-code   # what actually loaded
```

No dependencies, no build step, no test framework. `package.json` exists for
`npm test` and metadata only; do not add dependencies without asking.

Green means: **90 passed, 0 failed**, and `plugin details` reporting **9 agents,
19 skills, 5 hooks**. The skills count is 9 skills plus 10 commands.

## Manifest traps

Measured against `claude 2.1.260` and re-confirmed on `2.1.326`. These cost a
full debugging cycle each; `tests/plugin-structure.test.js` now guards them.

| Written as | What happens |
| --- | --- |
| `agents: "./agents"` | Rejected by `claude plugin validate` |
| `agents: ["./agents/x.md"]` | **Validates, then loads 0 agents** — silent failure |
| `agents` omitted | Auto-discovers `agents/` — correct, and what the manifest does |
| `mcpServers: "<path>"` | Validates, loads nothing. Deliberately absent |

The second row is the dangerous one: validation passes and only
`claude plugin details` reveals the failure. Never add an `agents` key.

`commands`, `skills` and `hooks` each take a path string and behave as expected.

## Do not gate the suite on `--strict`

`tests/plugin-structure.test.js` runs `claude plugin validate --json` **without**
`--strict`, on purpose. Strict promotes warnings to failures, and the validator's
warning set grows with each Claude Code release — currently a naming opinion and
a missing listing icon for directory submission. Neither is a defect here.
Gating on them means the suite breaks on Anthropic's release cadence instead of
on our changes. Schema breakage, the thing worth catching, is reported as an
**error**, which the test asserts is empty.

## Writing tests

A suite exports `{ name, cases }`; `cases` maps a behavior description to a
function that throws to fail. `node:assert/strict` does the asserting.
`tests/run-all.js` discovers `*.test.js` recursively, skipping `helpers/`.

```js
module.exports = {
  name: 'lib/thing',
  cases: {
    'returns the fallback when the file is missing': () => {
      assert.equal(readText('/nope', 'fb'), 'fb');
    },
  },
};
```

`tests/helpers/harness.js` provides `withTempDir`, `writeFixture`,
`runHookScript` (drives a hook through real stdin/stdout) and `spawnNode`.

**Prove a new test can fail.** Break the thing it guards, watch it go red,
then revert. A test that has never failed is not known to test anything.

## Hook rules

Every hook in `scripts/hooks/` must hold to these, and the tests check them:

- **Never block the session.** Wrap the body in `runHook()`, which reports on
  stderr and still exits 0.
- **Never crash on bad input.** `readHookInput()` resolves to `{}` on empty,
  closed or malformed stdin, with a 2-second timeout.
- **Suggest, don't decide.** The compaction and learning hooks emit a
  `systemMessage` and stop.
- **Bounded state.** Tracker files prune themselves. Automatic snapshots
  *merge* into an existing checkpoint rather than overwriting it, so a rich
  `/checkpoint` survives the snapshot taken at session end.

Hook state lives in `<project>/.claude/memory/` and is gitignored.

## Adding a component

- **Agent** — `agents/<name>.md`, frontmatter `name` matching the filename, plus
  a `description` saying when to use it.
- **Skill** — `skills/<name>/SKILL.md`, frontmatter `name` matching the
  directory.
- **Command** — `commands/<name>.md`, frontmatter `description` required.
- **Rule** — `rules/<name>.md`, must open with an `# Rule: ` heading.

`tests/plugin-structure.test.js` enforces all of it. Run the suite before
pushing; a mismatched name fails there rather than silently failing to load.

## Scripts are cross-platform

`scripts/` is plain CommonJS Node with no dependencies, running on Linux, macOS
and Windows. Use `node:path` for paths, argument arrays for subprocesses (never
`shell: true`), and the helpers in `scripts/lib/utils.js` rather than new ones.
No bash-only assumptions — the hooks are invoked as
`node "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/<name>.js"`.

## Git

Conventional Commits. Never commit to `main` directly — branch, open a PR, merge
it. Read `git diff --staged` before every commit.
