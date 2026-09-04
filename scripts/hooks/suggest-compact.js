#!/usr/bin/env node
'use strict';

/**
 * PostToolUse hook — suggest compacting at a sensible moment.
 *
 * Tracks tool-call volume and transcript growth per session in
 * `.claude/memory/compact-tracker.json`. When a threshold is crossed it emits a
 * one-time suggestion; it never blocks and never nags twice for the same
 * threshold.
 *
 * Suggestion only. The decision to compact stays with the user.
 */

const fs = require('node:fs');
const path = require('node:path');
const {
  emit,
  memoryDir,
  projectDir,
  readHookInput,
  readJson,
  runHook,
  timestamp,
  writeJson,
} = require('../lib/utils');

/** Ordered low to high. The highest crossed threshold wins. */
const THRESHOLDS = [
  { id: 'tools-60', tools: 60, bytes: 400_000, level: 'early' },
  { id: 'tools-120', tools: 120, bytes: 900_000, level: 'due' },
  { id: 'tools-200', tools: 200, bytes: 1_600_000, level: 'overdue' },
];

const MESSAGES = {
  early:
    'Context is filling up. If you are at a natural seam — a feature done, a bug diagnosed — ' +
    'this is a cheap moment to run /checkpoint then /compact.',
  due:
    'This session is long. Run /checkpoint and /learn, then /compact with a focus argument ' +
    'naming what must survive. Do not compact mid-refactor.',
  overdue:
    'Context is well past a comfortable size and details are likely being lost. ' +
    'Reach a stable point (tests green, work committed), run /checkpoint and /learn, then /compact.',
};

/** Size of the transcript file in bytes, or 0 when unavailable. */
function transcriptBytes(file) {
  if (!file) return 0;
  try {
    return fs.statSync(file).size;
  } catch {
    return 0;
  }
}

/** The highest threshold crossed by either signal, or null. */
function crossed(toolCount, bytes) {
  let hit = null;
  for (const threshold of THRESHOLDS) {
    if (toolCount >= threshold.tools || bytes >= threshold.bytes) hit = threshold;
  }
  return hit;
}

async function main() {
  const input = await readHookInput();
  const root = input.cwd || projectDir();
  const sessionId = input.session_id || 'unknown-session';
  const trackerFile = path.join(memoryDir(root), 'compact-tracker.json');

  const tracker = readJson(trackerFile, {}) || {};
  const entry = tracker[sessionId] || { toolCalls: 0, notified: [] };

  entry.toolCalls += 1;
  entry.updatedAt = timestamp();

  const bytes = transcriptBytes(input.transcript_path);
  if (bytes) entry.transcriptBytes = bytes;

  const threshold = crossed(entry.toolCalls, bytes);
  const shouldNotify = Boolean(threshold) && !entry.notified.includes(threshold.id);

  if (shouldNotify) entry.notified.push(threshold.id);

  // Keep only the most recent sessions so the tracker cannot grow unbounded.
  tracker[sessionId] = entry;
  const keys = Object.keys(tracker);
  if (keys.length > 20) {
    const sorted = keys.sort(
      (a, b) => new Date(tracker[a].updatedAt || 0) - new Date(tracker[b].updatedAt || 0)
    );
    for (const stale of sorted.slice(0, keys.length - 20)) delete tracker[stale];
  }

  writeJson(trackerFile, tracker);

  if (shouldNotify) {
    emit({
      systemMessage:
        `[strategic-compact] ${MESSAGES[threshold.level]} ` +
        `(${entry.toolCalls} tool calls this session)`,
    });
  }
}

runHook('suggest-compact', main);
