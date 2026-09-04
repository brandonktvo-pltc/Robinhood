#!/usr/bin/env node
'use strict';

/**
 * Stop hook — evaluate what happened this session and queue it for learning.
 *
 * Records a compact summary of the work into
 * `.claude/memory/pending-learnings.md` and, when the session did enough to be
 * worth mining, suggests running /learn.
 *
 * Never blocks. A Stop hook that blocks turns a finished session into a loop.
 */

const path = require('node:path');
const {
  appendText,
  emit,
  gitBranch,
  memoryDir,
  projectDir,
  readHookInput,
  readJson,
  runCapture,
  runHook,
  timestamp,
  writeJson,
} = require('../lib/utils');

/** Below this many changed files, a session rarely produces a durable lesson. */
const MIN_CHANGED_FILES = 2;

/** Changed file paths relative to the repo root, staged and unstaged. */
function changedFiles(root) {
  const out = runCapture('git', ['status', '--porcelain'], { cwd: root, fallback: '' });
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
}

/** Commits made during the last day, as one-line summaries. */
function recentCommits(root) {
  const out = runCapture('git', ['log', '--oneline', '--since=1.day', '-10'], {
    cwd: root,
    fallback: '',
  });
  return out.split('\n').filter(Boolean);
}

async function main() {
  const input = await readHookInput();

  // A Stop hook fires again after it continues the model; do not re-run then.
  if (input.stop_hook_active) return;

  const root = input.cwd || projectDir();
  const memory = memoryDir(root);
  const sessionId = input.session_id || 'unknown-session';

  const files = changedFiles(root);
  const commits = recentCommits(root);
  const branch = gitBranch(root);

  const markerFile = path.join(memory, 'evaluated-sessions.json');
  const evaluated = readJson(markerFile, {}) || {};
  if (evaluated[sessionId]) return;

  const worthMining = files.length >= MIN_CHANGED_FILES || commits.length > 0;
  if (!worthMining) return;

  evaluated[sessionId] = timestamp();

  // Keep the marker file bounded.
  const ids = Object.keys(evaluated);
  if (ids.length > 50) {
    const sorted = ids.sort((a, b) => new Date(evaluated[a]) - new Date(evaluated[b]));
    for (const stale of sorted.slice(0, ids.length - 50)) delete evaluated[stale];
  }
  writeJson(markerFile, evaluated);

  const entry = [
    `## Session ${sessionId} — ${timestamp()}`,
    `Branch: ${branch || 'n/a'}`,
    files.length > 0
      ? `Changed files (${files.length}):\n${files.slice(0, 30).map((f) => `  - ${f}`).join('\n')}`
      : 'Changed files: none outstanding',
    commits.length > 0
      ? `Commits today:\n${commits.map((c) => `  - ${c}`).join('\n')}`
      : 'Commits today: none',
    'Not yet mined for durable patterns. Run `/learn` to extract, or delete this entry if there is nothing worth keeping.',
    '',
  ].join('\n');

  appendText(path.join(memory, 'pending-learnings.md'), `${entry}\n`);

  emit({
    systemMessage:
      `[continuous-learning] ${files.length} changed file(s) this session. ` +
      'Run /learn to capture anything durable, non-obvious and reusable before the context goes.',
  });
}

runHook('evaluate-session', main);
