'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { runHookScript, withTempDir } = require('../helpers/harness');
const { readJson, readText, writeText } = require('../../scripts/lib/utils');

const SCRIPT = path.resolve(__dirname, '..', '..', 'scripts', 'hooks', 'evaluate-session.js');
const pendingFile = (dir) => path.join(dir, '.claude', 'memory', 'pending-learnings.md');
const markerFile = (dir) => path.join(dir, '.claude', 'memory', 'evaluated-sessions.json');

/** Initialise a git repo in `dir` with `count` uncommitted files. */
function repoWithChanges(dir, count) {
  const run = (args) => execFileSync('git', args, { cwd: dir, stdio: 'ignore' });
  run(['init', '-q']);
  run(['config', 'user.email', 'test@example.com']);
  run(['config', 'user.name', 'Test']);
  for (let i = 0; i < count; i += 1) {
    writeText(path.join(dir, 'file-' + i + '.txt'), 'contents ' + i);
  }
}

module.exports = {
  name: 'hooks/evaluate-session',
  cases: {
    'stays silent when nothing changed': () =>
      withTempDir((dir) => {
        repoWithChanges(dir, 0);
        const result = runHookScript(SCRIPT, { cwd: dir, session_id: 'quiet' }, { cwd: dir });
        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.json, null);
        assert.equal(readText(pendingFile(dir)), null);
      }),

    'stays silent for a single changed file': () =>
      withTempDir((dir) => {
        repoWithChanges(dir, 1);
        const result = runHookScript(SCRIPT, { cwd: dir, session_id: 'one' }, { cwd: dir });
        assert.equal(result.json, null);
      }),

    'queues the session once enough files changed': () =>
      withTempDir((dir) => {
        repoWithChanges(dir, 3);
        const result = runHookScript(SCRIPT, { cwd: dir, session_id: 'busy' }, { cwd: dir });

        assert.equal(result.status, 0, result.stderr);
        assert.match(result.json.systemMessage, /continuous-learning/);
        assert.match(result.json.systemMessage, /\/learn/);

        const pending = readText(pendingFile(dir), '');
        assert.match(pending, /Session busy/);
        assert.match(pending, /file-0\.txt/);
      }),

    'queues a session only once, even if Stop fires again': () =>
      withTempDir((dir) => {
        repoWithChanges(dir, 3);
        const first = runHookScript(SCRIPT, { cwd: dir, session_id: 'dup' }, { cwd: dir });
        const second = runHookScript(SCRIPT, { cwd: dir, session_id: 'dup' }, { cwd: dir });

        assert.notEqual(first.json, null);
        assert.equal(second.json, null);

        const occurrences = readText(pendingFile(dir), '').match(/## Session dup/g) || [];
        assert.equal(occurrences.length, 1);
      }),

    'does nothing when stop_hook_active is set': () =>
      withTempDir((dir) => {
        repoWithChanges(dir, 3);
        const result = runHookScript(
          SCRIPT,
          { cwd: dir, session_id: 'active', stop_hook_active: true },
          { cwd: dir }
        );
        assert.equal(result.json, null);
        assert.equal(readText(pendingFile(dir)), null);
      }),

    'records the session in the marker file': () =>
      withTempDir((dir) => {
        repoWithChanges(dir, 3);
        runHookScript(SCRIPT, { cwd: dir, session_id: 'marked' }, { cwd: dir });
        const marker = readJson(markerFile(dir));
        assert.equal(Number.isNaN(Date.parse(marker.marked)), false);
      }),

    'exits 0 outside a git repository': () =>
      withTempDir((dir) => {
        const result = runHookScript(SCRIPT, { cwd: dir, session_id: 'nogit' }, { cwd: dir });
        assert.equal(result.status, 0, result.stderr);
      }),
  },
};
