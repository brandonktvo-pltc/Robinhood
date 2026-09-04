# everything-claude-code

A complete Claude Code configuration kit — subagents, skills, slash commands,
rules, hooks, and cross-platform automation scripts, packaged as an installable
plugin.

Everything here is real and runs. The hooks are tested Node.js scripts, not
snippets: `node tests/run-all.js` exercises them end to end.

---

## Install

```bash
# In Claude Code
/plugin marketplace add brandonktvo-pltc/Robinhood
/plugin install everything-claude-code
```

Or point at a local clone:

```bash
git clone https://github.com/brandonktvo-pltc/Robinhood.git
# then, in Claude Code
/plugin marketplace add ./Robinhood
/plugin install everything-claude-code
```

Verify:

```bash
/plugin           # the plugin is listed and enabled
/agents           # nine agents available
/help             # ten slash commands available
```

The `rules/` directory is **not** installed by the plugin — copy the ones you
want into `~/.claude/rules/` (see [Rules](#rules)).

---

## What is in it

```
.claude-plugin/   plugin + marketplace manifests
agents/           9 subagents
skills/           9 skills
commands/         10 slash commands
rules/            6 always-follow rule files (copy to ~/.claude/rules/)
hooks/            hook wiring + docs
scripts/          cross-platform Node implementations
tests/            75+ tests covering the scripts and the manifests
contexts/         3 system-prompt modes
examples/         example CLAUDE.md at project and user level
mcp-configs/      MCP server catalogue
```

---

## Agents

Delegated automatically when the situation matches, or explicitly by name.

| Agent | Model | Use for |
| --- | --- | --- |
| [`planner`](agents/planner.md) | opus | Step-by-step implementation plan before a multi-file change |
| [`architect`](agents/architect.md) | opus | "How should this be structured" — options, tradeoffs, a recommendation |
| [`tdd-guide`](agents/tdd-guide.md) | sonnet | Strict red-green-refactor implementation |
| [`code-reviewer`](agents/code-reviewer.md) | opus | Diff review: correctness, reuse, simplification, test gaps |
| [`security-reviewer`](agents/security-reviewer.md) | opus | Vulnerability analysis on a diff |
| [`build-error-resolver`](agents/build-error-resolver.md) | sonnet | Failing build, typecheck or lint |
| [`e2e-runner`](agents/e2e-runner.md) | sonnet | Playwright tests for a user flow |
| [`refactor-cleaner`](agents/refactor-cleaner.md) | sonnet | Dead code, unused exports, stale dependencies |
| [`doc-updater`](agents/doc-updater.md) | sonnet | Sync docs after an API or config change |

Every agent states a verification bar and what it must not do. The review agents
are read-only and require a constructible failure before reporting a finding.

---

## Skills

Loaded on demand when the task matches the description.

| Skill | Covers |
| --- | --- |
| [`coding-standards`](skills/coding-standards/SKILL.md) | TypeScript, Python, Go — naming, errors, types, module layout |
| [`backend-patterns`](skills/backend-patterns/SKILL.md) | API design, database, caching, background jobs, observability |
| [`frontend-patterns`](skills/frontend-patterns/SKILL.md) | React and Next.js — state placement, server components, forms, a11y |
| [`tdd-workflow`](skills/tdd-workflow/SKILL.md) | The red-green-refactor discipline and what to test |
| [`security-review`](skills/security-review/SKILL.md) | The eight-section pre-merge security checklist |
| [`continuous-learning`](skills/continuous-learning/SKILL.md) | Extracting durable patterns into project memory |
| [`strategic-compact`](skills/strategic-compact/SKILL.md) | When to compact and what must survive |
| [`verification-loop`](skills/verification-loop/SKILL.md) | Never claim done without the command that proves it |
| [`eval-harness`](skills/eval-harness/SKILL.md) | Measuring whether a prompt or agent change actually helped |

---

## Commands

| Command | Does |
| --- | --- |
| `/tdd <feature>` | Implement test-first, one red-green-refactor cycle at a time |
| `/plan <feature>` | Produce an implementation plan, no code |
| `/e2e <flow>` | Write and run Playwright tests for a user flow |
| `/code-review [scope]` | Review the diff; adds a security pass when the diff warrants |
| `/build-fix [error]` | Diagnose and minimally fix a failing build |
| `/refactor-clean [path]` | Remove dead code, behavior-preserving |
| `/learn [topic]` | Extract durable patterns into `.claude/memory/learned-patterns.md` |
| `/checkpoint [note]` | Save goal, decisions, next action and blockers to disk |
| `/verify [rung]` | Run the verification ladder and report real output |
| `/setup-pm [pm]` | Detect and configure the project's package manager |

---

## Rules

Always-follow guidelines. The plugin does not install these — copy the ones you
want:

```bash
mkdir -p ~/.claude/rules
cp rules/*.md ~/.claude/rules/
```

| File | Enforces |
| --- | --- |
| [`security.md`](rules/security.md) | Never-commit list, parameterized queries, authz on the object |
| [`coding-style.md`](rules/coding-style.md) | Immutability, naming, error handling, file organization |
| [`testing.md`](rules/testing.md) | Tests ship with the code, 80% on changed code, never weaken a test |
| [`git-workflow.md`](rules/git-workflow.md) | Conventional Commits, atomic commits, read your own diff |
| [`agents.md`](rules/agents.md) | When delegation pays for itself and when it does not |
| [`performance.md`](rules/performance.md) | Model selection, context management, tool batching |

---

## Hooks

Five hooks, wired in [`hooks/hooks.json`](hooks/hooks.json), implemented as
cross-platform Node scripts under [`scripts/hooks/`](scripts/hooks/).

| Event | Script | Effect |
| --- | --- | --- |
| `SessionStart` | `session-start.js` | Reloads the checkpoint, learned patterns, git state and package manager |
| `SessionEnd` | `session-end.js` | Merges a git snapshot into the checkpoint, appends to the session log |
| `PreCompact` | `pre-compact.js` | Safety-net checkpoint plus a list of what the summary must keep |
| `PostToolUse` | `suggest-compact.js` | Suggests compacting once per threshold, never blocks |
| `Stop` | `evaluate-session.js` | Queues the session for `/learn`, once |

Design rules they follow: never block the session, never crash on bad input,
suggest rather than decide, and keep every state file bounded. Details in
[`hooks/README.md`](hooks/README.md).

### The memory cycle

```
session N                                session N+1
─────────────────────────────────        ─────────────────────────
 /checkpoint ──▶ session-state.json ────▶ SessionStart hook reads
 /learn ──────▶ learned-patterns.md ────▶ both back into context
 PreCompact ──▶ snapshot (merge)
 SessionEnd ──▶ snapshot (merge)
```

Automatic snapshots **merge** into the checkpoint — a rich `/checkpoint` is
never clobbered by the snapshot taken on exit.

State lives in `<project>/.claude/memory/` and belongs in `.gitignore`.

---

## Scripts

Cross-platform Node.js. No dependencies, no shell scripts, no `bash`-only
assumptions — the same code runs on Linux, macOS and Windows.

```
scripts/
  lib/utils.js               files, paths, git, hook I/O, safe process exec
  lib/package-manager.js     npm | pnpm | yarn | bun detection and commands
  hooks/*.js                 the five hook implementations
  setup-package-manager.js   interactive / --auto / --set / --detect / --json
```

### Package manager detection

Precedence, highest first:

1. Saved preference — `.claude/package-manager.json`
2. `packageManager` field in `package.json`
3. Lockfile — `bun.lock(b)` › `pnpm-lock.yaml` › `yarn.lock` › `package-lock.json`
4. First supported binary on `PATH`
5. `npm`

```bash
node scripts/setup-package-manager.js --detect   # report, write nothing
node scripts/setup-package-manager.js --auto     # detect and save
node scripts/setup-package-manager.js --set pnpm # save explicitly
node scripts/setup-package-manager.js --json     # machine-readable
```

`--auto` refuses to save when more than one lockfile is present. Two lockfiles
is a correctness problem, not a preference.

---

## Tests

```bash
node tests/run-all.js                 # everything
node tests/run-all.js package-manager # one suite
npm test                              # same as run-all
```

No test framework and no dependencies — [`tests/run-all.js`](tests/run-all.js)
discovers `*.test.js`, and each suite exports `{ name, cases }` with
`node:assert` doing the asserting.

Coverage: the two libraries, all five hooks driven end to end through real
stdin/stdout with temp directories and real git repos, and the plugin's own
manifests (every path a manifest names must exist, every component must carry
loadable frontmatter, no MCP entry may hold a literal secret).

---

## Contexts

System-prompt modes in [`contexts/`](contexts/):

```bash
claude --append-system-prompt "$(cat contexts/dev.md)"
```

- [`dev.md`](contexts/dev.md) — implementing: bias to action, verify every step
- [`review.md`](contexts/review.md) — reviewing: adversarial, read-only, evidence required
- [`research.md`](contexts/research.md) — exploring: read-only, cite every claim

---

## MCP servers

[`mcp-configs/mcp-servers.json`](mcp-configs/mcp-servers.json) catalogues
GitHub, filesystem, Postgres, Supabase, Playwright, Sentry, Vercel and Railway.

It is a catalogue, not a manifest to apply wholesale — every enabled server adds
tool definitions to every turn. Secrets are `${ENV_VAR}` placeholders; never
replace one with a literal token. See
[`mcp-configs/README.md`](mcp-configs/README.md).

---

## Examples

- [`examples/CLAUDE.md`](examples/CLAUDE.md) — project-level config: commands,
  architecture, conventions, gotchas
- [`examples/user-CLAUDE.md`](examples/user-CLAUDE.md) — user-level config for
  `~/.claude/CLAUDE.md`

Copy and edit every line. A `CLAUDE.md` describing a different project is worse
than none.

---

## Repository layout

```
everything-claude-code/
├── .claude-plugin/
│   ├── plugin.json              component paths, metadata
│   └── marketplace.json         marketplace catalogue
├── marketplace.json             copy at the root for discovery
├── agents/                      9 subagents
├── skills/<name>/SKILL.md       9 skills
├── commands/                    10 slash commands
├── rules/                       6 rule files
├── hooks/
│   ├── hooks.json               all hook wiring
│   ├── memory-persistence/      session lifecycle docs
│   └── strategic-compact/       compaction suggestion docs
├── scripts/
│   ├── lib/                     utils.js, package-manager.js
│   ├── hooks/                   5 hook implementations
│   └── setup-package-manager.js
├── tests/
│   ├── helpers/harness.js
│   ├── lib/                     library tests
│   ├── hooks/                   hook tests
│   ├── plugin-structure.test.js manifest and frontmatter checks
│   └── run-all.js
├── contexts/                    dev, review, research
├── examples/                    CLAUDE.md samples
└── mcp-configs/                 MCP server catalogue
```

---

## Contributing

```bash
node tests/run-all.js
```

Green before you push. New scripts get tests. New agents, skills and commands
must pass `tests/plugin-structure.test.js` — name matching the filename or
directory, and a description that says when to use it.

## License

MIT — see [LICENSE](LICENSE).
