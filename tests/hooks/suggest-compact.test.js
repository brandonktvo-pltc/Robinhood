'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { runHookScript, withTempDir } = require('../helpers/harness');
const { readJson } = require('../../scripts/lib/utils');

const SCRIPT = path.resolve(__dirname, '..', '..', 'scripts', 'hooks', 'suggest-compact.js');
const trackerFile = (dir) => path.join(dir, '.claude', 'memory', 'compact-tracker.json');

/** Invoke the hook `times` times, returning every emitted systemMessage. */
function pump(dir, sessionId, times, extra = {}) {
  const messages = [];
  for (let i = 0; i < times; i += 1) {
    const result = runHookScript(
      SCRIPT,
      { cwd: dir, session_id: sessionId, ...extra },
      { cwd: dir }
    );
    assert.equal(result.status, 0, result.stderr);
    if (result.json && result.json.systemMessage) messages.push(result.json.systemMessage);
  }
  return messages;
}

module.exports = {
  name: 'hooks/suggest-compact',
  cases: {
    'stays silent well below the first threshold': () =>
      withTempDir((dir) => {
        const messages = pump(dir, 'quiet', 5);
        assert.deepEqual(messages, []);
      }),

    'counts every invocation in the tracker': () =>
      withTempDir((dir) => {
        pump(dir, 'counted', 4);
        assert.equal(readJson(trackerFile(dir)).counted.toolCalls, 4);
      }),

    'fires once when the first tool-call threshold is crossed': () =>
      withTempDir((dir) => {
        const messages = pump(dir, 's', 62);
        assert.equal(messages.length, 1);
        assert.match(messages[0], /strategic-compact/);
        assert.match(messages[0], /60 tool calls/);
      }),

    'records which thresholds have already fired': () =>
      withTempDir((dir) => {
        pump(dir, 's', 61);
        assert.deepEqual(readJson(trackerFile(dir)).s.notified, ['tools-60']);
      }),

    'fires again at the next threshold, not in between': () =>
      withTempDir((dir) => {
        const messages = pump(dir, 's', 121);
        assert.equal(messages.length, 2);
        assert.match(messages[1], /checkpoint/i);
        assert.deepEqual(readJson(trackerFile(dir)).s.notified, ['tools-60', 'tools-120']);
      }),

    'a large transcript crosses the threshold without waiting for tool calls': () =>
      withTempDir((dir) => {
        const transcript = path.join(dir, 'transcript.jsonl');
        fs.writeFileSync(transcript, 'x'.repeat(450_000));

        const messages = pump(dir, 'big', 1, { transcript_path: transcript });
        assert.equal(messages.length, 1);
        assert.match(messages[0], /1 tool calls/);
      }),

    'records transcript size when the file is readable': () =>
      withTempDir((dir) => {
        const transcript = path.join(dir, 'transcript.jsonl');
        fs.writeFileSync(transcript, 'x'.repeat(1000));
        pump(dir, 'sized', 1, { transcript_path: transcript });
        assert.equal(readJson(trackerFile(dir)).sized.transcriptBytes, 1000);
      }),

    'tolerates a missing transcript path': () =>
      withTempDir((dir) => {
        const messages = pump(dir, 'nofile', 1, { transcript_path: path.join(dir, 'gone.jsonl') });
        assert.deepEqual(messages, []);
      }),

    'tracks sessions independently': () =>
      withTempDir((dir) => {
        pump(dir, 'a', 3);
        pump(dir, 'b', 7);
        const tracker = readJson(trackerFile(dir));
        assert.equal(tracker.a.toolCalls, 3);
        assert.equal(tracker.b.toolCalls, 7);
      }),

    'prunes the tracker to the twenty most recent sessions': () =>
      withTempDir((dir) => {
        for (let i = 0; i < 25; i += 1) pump(dir, 'session-' + i, 1);
        assert.equal(Object.keys(readJson(trackerFile(dir))).length, 20);
      }),

    'survives a corrupt tracker file': () =>
      withTempDir((dir) => {
        const { writeText } = require('../../scripts/lib/utils');
        writeText(trackerFile(dir), 'not json');
        const result = runHookScript(SCRIPT, { cwd: dir, session_id: 's' }, { cwd: dir });
        assert.equal(result.status, 0, result.stderr);
        assert.equal(readJson(trackerFile(dir)).s.toolCalls, 1);
      }),
  },
};
