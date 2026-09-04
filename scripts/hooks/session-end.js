#!/usr/bin/env node
'use strict';

/**
 * SessionEnd hook — persist what the next session needs to resume.
 *
 * Merges into `.claude/memory/session-state.json` rather than overwriting, so a
 * richer checkpoint written by /checkpoint is not clobbered by the automatic
 * snapshot taken on exit. Also appends a line to `.claude/memory/session-log.md`.
 */

const path = require('node:path');
const {
  appendText,
  gitBranch,
  gitStatus,
  isoDate,
  memoryDir,
  projectDir,
  readHookInput,
  readJson,
  runHook,
  runCapture,
  timestamp,
  writeJson,
} = require('../lib/utils');

function snapshot(root) {
  const status = gitStatus(root);
  return {
    branch: gitBranch(root),
    uncommitted: status.slice(0, 50),
    lastCommit: runCapture('git', ['log', '-1', '--oneline'], { cwd: root }),
  };
}

async function main() {
  const input = await readHookInput();
  const root = input.cwd || projectDir();
  const memory = memoryDir(root);
  const stateFile = path.join(memory, 'session-state.json');

  const previous = readJson(stateFile, {}) || {};
  const snap = snapshot(root);

  const merged = {
    ...previous,
    updatedAt: timestamp(),
    branch: snap.branch || previous.branch || null,
    lastCommit: snap.lastCommit,
    endedReason: input.reason || 'unknown',
    state: {
      ...(previous.state || {}),
      uncommitted: snap.uncommitted,
    },
  };

  writeJson(stateFile, merged);

  appendText(
    path.join(memory, 'session-log.md'),
    `- ${isoDate()} ${timestamp()} — branch \`${merged.branch || 'n/a'}\`, ` +
      `${snap.uncommitted.length} uncommitted file(s), ended: ${merged.endedReason}\n`
  );
}

runHook('session-end', main);
