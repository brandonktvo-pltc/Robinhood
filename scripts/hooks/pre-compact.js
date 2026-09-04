#!/usr/bin/env node
'use strict';

/**
 * PreCompact hook — take a safety-net snapshot before context is summarized,
 * and tell the summarizer what must survive.
 *
 * Compaction is lossy. The checkpoint written here is what the SessionStart
 * hook reads back if the summary drops something important.
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
  runCapture,
  runHook,
  timestamp,
  writeJson,
} = require('../lib/utils');

const PRESERVE = [
  'The goal — what "done" looks like, in one sentence.',
  'Decisions made and the reasoning, including options considered and rejected.',
  'Current state: files changed, what is committed, what is not.',
  'The specific next action — a step, not a direction.',
  'Blockers and what each is waiting on.',
  'Hard-won facts: commands that work, flags that matter, gotchas already hit.',
];

async function main() {
  const input = await readHookInput();
  const root = input.cwd || projectDir();
  const memory = memoryDir(root);
  const stateFile = path.join(memory, 'session-state.json');

  const previous = readJson(stateFile, {}) || {};
  const status = gitStatus(root);

  writeJson(stateFile, {
    ...previous,
    updatedAt: timestamp(),
    branch: gitBranch(root) || previous.branch || null,
    lastCommit: runCapture('git', ['log', '-1', '--oneline'], { cwd: root }),
    compactedAt: timestamp(),
    compactTrigger: input.trigger || 'unknown',
    state: {
      ...(previous.state || {}),
      uncommitted: status.slice(0, 50),
    },
  });

  const custom = typeof input.custom_instructions === 'string' ? input.custom_instructions.trim() : '';

  const body = [
    '# Compaction in progress — preserve the following',
    ...PRESERVE.map((line) => `- ${line}`),
    '',
    `A snapshot was written to \`${path.relative(root, stateFile) || stateFile}\` and will be reloaded on the next session start.`,
    custom ? `\nUser focus for this compaction: ${custom}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  emit(additionalContext('PreCompact', body));
}

runHook('pre-compact', main);
