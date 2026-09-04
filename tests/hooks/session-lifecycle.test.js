'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

const { runHookScript, withTempDir } = require('../helpers/harness');
const { readJson, readText, writeJson } = require('../../scripts/lib/utils');

const HOOKS = path.resolve(__dirname, '..', '..', 'scripts', 'hooks');
const SESSION_START = path.join(HOOKS, 'session-start.js');
const SESSION_END = path.join(HOOKS, 'session-end.js');
const PRE_COMPACT = path.join(HOOKS, 'pre-compact.js');

const stateFile = (dir) => path.join(dir, '.claude', 'memory', 'session-state.json');

module.exports = {
  name: 'hooks/session-lifecycle',
  cases: {
    'session-start exits 0 and emits context with no memory present': () =>
      withTempDir((dir) => {
        const result = runHookScript(SESSION_START, { cwd: dir, source: 'startup' }, { cwd: dir });
        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.json.hookSpecificOutput.hookEventName, 'SessionStart');
        assert.match(result.json.hookSpecificOutput.additionalContext, /Environment/);
      }),

    'session-start reports the source it was given': () =>
      withTempDir((dir) => {
        const result = runHookScript(SESSION_START, { cwd: dir, source: 'resume' }, { cwd: dir });
        assert.match(result.json.hookSpecificOutput.additionalContext, /source: resume/);
      }),

    'session-start replays the goal, next action and rejected options': () =>
      withTempDir((dir) => {
        writeJson(stateFile(dir), {
          updatedAt: '2026-09-04T00:00:00.000Z',
          goal: 'Orders paginate by cursor',
          nextAction: 'Add the duplicate-timestamp boundary test',
          decisions: [{ decision: 'cursor on (created_at, id)', why: 'created_at is not unique' }],
          rejected: [{ option: 'offset pagination', why: 'drifts under concurrent inserts' }],
          blockers: ['waiting on the staging migration'],
          facts: ['seed no-ops silently if migrations have not run'],
        });

        const context = runHookScript(SESSION_START, { cwd: dir }, { cwd: dir }).json
          .hookSpecificOutput.additionalContext;

        assert.match(context, /Orders paginate by cursor/);
        assert.match(context, /Add the duplicate-timestamp boundary test/);
        assert.match(context, /offset pagination/);
        assert.match(context, /waiting on the staging migration/);
        assert.match(context, /seed no-ops silently/);
      }),

    'session-start includes learned patterns when they exist': () =>
      withTempDir((dir) => {
        const { writeText } = require('../../scripts/lib/utils');
        writeText(
          path.join(dir, '.claude', 'memory', 'learned-patterns.md'),
          '## Gotchas\n\n### Migrations before seed\nThe seed exits 0 doing nothing.\n'
        );
        const context = runHookScript(SESSION_START, { cwd: dir }, { cwd: dir }).json
          .hookSpecificOutput.additionalContext;
        assert.match(context, /Migrations before seed/);
      }),

    'session-start survives a corrupt state file': () =>
      withTempDir((dir) => {
        const { writeText } = require('../../scripts/lib/utils');
        writeText(stateFile(dir), '{ not json at all');
        const result = runHookScript(SESSION_START, { cwd: dir }, { cwd: dir });
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.json.hookSpecificOutput.additionalContext, /Environment/);
      }),

    'session-start survives empty stdin': () =>
      withTempDir((dir) => {
        const { spawnNode } = require('../helpers/harness');
        const result = spawnNode(SESSION_START, [], { input: '', cwd: dir });
        assert.equal(result.status, 0, result.stderr);
      }),

    'session-end writes a state file and a session log line': () =>
      withTempDir((dir) => {
        const result = runHookScript(SESSION_END, { cwd: dir, reason: 'exit' }, { cwd: dir });
        assert.equal(result.status, 0, result.stderr);

        const state = readJson(stateFile(dir));
        assert.equal(state.endedReason, 'exit');
        assert.equal(Number.isNaN(Date.parse(state.updatedAt)), false);

        const log = readText(path.join(dir, '.claude', 'memory', 'session-log.md'), '');
        assert.match(log, /ended: exit/);
      }),

    'session-end merges into an existing checkpoint rather than overwriting it': () =>
      withTempDir((dir) => {
        writeJson(stateFile(dir), {
          goal: 'keep me',
          nextAction: 'keep me too',
          decisions: [{ decision: 'd', why: 'w' }],
        });

        runHookScript(SESSION_END, { cwd: dir, reason: 'clear' }, { cwd: dir });

        const state = readJson(stateFile(dir));
        assert.equal(state.goal, 'keep me');
        assert.equal(state.nextAction, 'keep me too');
        assert.deepEqual(state.decisions, [{ decision: 'd', why: 'w' }]);
        assert.equal(state.endedReason, 'clear');
      }),

    'pre-compact snapshots state and tells the summarizer what to preserve': () =>
      withTempDir((dir) => {
        const result = runHookScript(
          PRE_COMPACT,
          { cwd: dir, trigger: 'manual', custom_instructions: 'keep the auth decisions' },
          { cwd: dir }
        );

        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.json.hookSpecificOutput.hookEventName, 'PreCompact');

        const context = result.json.hookSpecificOutput.additionalContext;
        assert.match(context, /The goal/);
        assert.match(context, /next action/i);
        assert.match(context, /keep the auth decisions/);

        const state = readJson(stateFile(dir));
        assert.equal(state.compactTrigger, 'manual');
        assert.equal(Number.isNaN(Date.parse(state.compactedAt)), false);
      }),

    'pre-compact preserves an existing checkpoint goal': () =>
      withTempDir((dir) => {
        writeJson(stateFile(dir), { goal: 'survive compaction' });
        runHookScript(PRE_COMPACT, { cwd: dir, trigger: 'auto' }, { cwd: dir });
        assert.equal(readJson(stateFile(dir)).goal, 'survive compaction');
      }),

    'pre-compact omits the focus line when none is given': () =>
      withTempDir((dir) => {
        const context = runHookScript(PRE_COMPACT, { cwd: dir, trigger: 'auto' }, { cwd: dir }).json
          .hookSpecificOutput.additionalContext;
        assert.equal(/User focus/.test(context), false);
      }),
  },
};
