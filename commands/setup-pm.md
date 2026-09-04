---
description: Detect and configure the package manager for this project
argument-hint: [optional: npm | pnpm | yarn | bun]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /setup-pm

Requested: **$ARGUMENTS** (empty means auto-detect)

## Detection

!`node "${CLAUDE_PLUGIN_ROOT:-.}/scripts/setup-package-manager.js" --detect 2>/dev/null || echo "(detection script not reachable — inspect lockfiles manually)"`

## Instructions

1. **If an argument was given**, set that package manager:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT:-.}/scripts/setup-package-manager.js" --set $ARGUMENTS
   ```

2. **Otherwise auto-detect and save** the detected choice:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT:-.}/scripts/setup-package-manager.js" --auto
   ```

Detection precedence: saved preference → `packageManager` field in
`package.json` → lockfile (`bun.lockb`/`bun.lock`, `pnpm-lock.yaml`,
`yarn.lock`, `package-lock.json`) → installed binaries → `npm`.

3. **Report the resolved commands** — install, add, add-dev, run, exec, test —
   and confirm where the preference was written
   (`.claude/package-manager.json`).

4. **If the detected manager is not installed**, say so and name the install
   command rather than silently falling back.

Never mix package managers in one project — a second lockfile is a correctness
problem, not a style one. If more than one lockfile is present, report it and
ask which is authoritative before writing anything.
