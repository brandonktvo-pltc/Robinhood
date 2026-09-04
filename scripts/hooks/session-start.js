#!/usr/bin/env node
'use strict';

/**
 * SessionStart hook — reload persisted context at the top of a session.
 *
 * Reads `.claude/memory/session-state.json` (written by /checkpoint, the
 * SessionEnd hook, or the PreCompact hook) and `.claude/memory/learned-patterns.md`
 * (written by /learn), and injects a compact briefing as additional context.
 *
 * Emits nothing when there is nothing worth saying.
 */

const path = require('node:path');
const {
  additionalContext,
  emit,
  gitBranch,
  gitStatus,
  memoryDir,
  projectDir,
  readHookInput,
  readJson,
  readText,
  runHook,
  truncate,
} = require('../lib/utils');
const { detect } = require('../lib/package-manager');

const MAX_PATTERNS_CHARS = 4000;

function formatList(label, items, render) {
  if (!Array.isArray(items) || items.length === 0) return [];
  return [`${label}:`, ...items.map((item) => `  - ${render ? render(item) : item}`)];
}

function formatState(state) {
  if (!state || typeof state !== 'object') return [];

  const lines = ['## Where the last session left off'];

  if (state.updatedAt) lines.push(`Checkpointed: ${state.updatedAt}`);
  if (state.goal) lines.push(`Goal: ${state.goal}`);
  if (state.nextAction) lines.push(`Next action: ${state.nextAction}`);

  lines.push(
    ...formatList('Decisions', state.decisions, (d) =>
      typeof d === 'string' ? d : `${d.decision} — ${d.why}`
    )
  );
  lines.push(
    ...formatList('Rejected (do not relitigate)', state.rejected, (r) =>
      typeof r === 'string' ? r : `${r.option} — ${r.why}`
    )
  );

  if (state.state && typeof state.state === 'object') {
    lines.push(...formatList('Uncommitted', state.state.uncommitted));
    lines.push(...formatList('Verified', state.state.verified));
  }

  lines.push(...formatList('Blockers', state.blockers));
  lines.push(...formatList('Facts worth keeping', state.facts));

  return lines.length > 1 ? lines : [];
}

function formatEnvironment(root) {
  const lines = ['## Environment'];

  const branch = gitBranch(root);
  if (branch) lines.push(`Branch: ${branch}`);

  const status = gitStatus(root);
  lines.push(
    status.length === 0
      ? 'Working tree: clean'
      : `Working tree: ${status.length} changed file(s)\n${status
          .slice(0, 15)
          .map((line) => `  ${line}`)
          .join('\n')}`
  );

  const pm = detect(root);
  lines.push(`Package manager: ${pm.packageManager} (via ${pm.source})`);
  if (pm.conflict) {
    lines.push(`  WARNING: multiple lockfiles present — ${pm.lockfiles.join(', ')}`);
  }

  return lines;
}

async function main() {
  const input = await readHookInput();
  const root = input.cwd || projectDir();
  const memory = memoryDir(root);

  const sections = [];

  const state = readJson(path.join(memory, 'session-state.json'));
  const stateLines = formatState(state);
  if (stateLines.length > 0) sections.push(stateLines.join('\n'));

  const patterns = readText(path.join(memory, 'learned-patterns.md'));
  if (patterns && patterns.trim()) {
    sections.push(`## Learned patterns for this project\n${truncate(patterns.trim(), MAX_PATTERNS_CHARS)}`);
  }

  sections.push(formatEnvironment(root).join('\n'));

  const source = input.source ? ` (source: ${input.source})` : '';
  const body = [`# Restored session context${source}`, ...sections].join('\n\n');

  emit(additionalContext('SessionStart', body));
}

runHook('session-start', main);
