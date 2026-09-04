'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const utils = require('../../scripts/lib/utils');
const { withTempDir, writeFixture } = require('../helpers/harness');

module.exports = {
  name: 'lib/utils',
  cases: {
    'pathExists reports true for a real path and false for a missing one': () =>
      withTempDir((dir) => {
        writeFixture(dir, 'present.txt', 'x');
        assert.equal(utils.pathExists(path.join(dir, 'present.txt')), true);
        assert.equal(utils.pathExists(path.join(dir, 'absent.txt')), false);
      }),

    'ensureDir creates nested directories': () =>
      withTempDir((dir) => {
        const nested = path.join(dir, 'a', 'b', 'c');
        utils.ensureDir(nested);
        assert.equal(fs.statSync(nested).isDirectory(), true);
      }),

    'readText returns the fallback for a missing file': () =>
      withTempDir((dir) => {
        assert.equal(utils.readText(path.join(dir, 'nope.txt'), 'fb'), 'fb');
        assert.equal(utils.readText(path.join(dir, 'nope.txt')), null);
      }),

    'writeText creates parent directories': () =>
      withTempDir((dir) => {
        const file = path.join(dir, 'deep', 'nested', 'file.txt');
        utils.writeText(file, 'hello');
        assert.equal(fs.readFileSync(file, 'utf8'), 'hello');
      }),

    'appendText adds to an existing file without truncating it': () =>
      withTempDir((dir) => {
        const file = path.join(dir, 'log.md');
        utils.appendText(file, 'one\n');
        utils.appendText(file, 'two\n');
        assert.equal(fs.readFileSync(file, 'utf8'), 'one\ntwo\n');
      }),

    'readJson round-trips through writeJson': () =>
      withTempDir((dir) => {
        const file = path.join(dir, 'state.json');
        utils.writeJson(file, { a: 1, b: ['x'] });
        assert.deepEqual(utils.readJson(file), { a: 1, b: ['x'] });
      }),

    'readJson returns the fallback on malformed JSON rather than throwing': () =>
      withTempDir((dir) => {
        const file = writeFixture(dir, 'bad.json', '{ not json');
        assert.deepEqual(utils.readJson(file, { safe: true }), { safe: true });
      }),

    'writeJson ends the file with a newline': () =>
      withTempDir((dir) => {
        const file = path.join(dir, 'x.json');
        utils.writeJson(file, { a: 1 });
        assert.equal(fs.readFileSync(file, 'utf8').endsWith('\n'), true);
      }),

    'resolveWithin allows a path inside the root': () => {
      assert.equal(utils.resolveWithin('/srv/app', 'src/index.ts'), path.resolve('/srv/app/src/index.ts'));
    },

    'resolveWithin allows the root itself': () => {
      assert.equal(utils.resolveWithin('/srv/app', '.'), path.resolve('/srv/app'));
    },

    'resolveWithin rejects traversal out of the root': () => {
      assert.equal(utils.resolveWithin('/srv/app', '../etc/passwd'), null);
      assert.equal(utils.resolveWithin('/srv/app', '../app-evil/x'), null);
    },

    'resolveWithin rejects an absolute path outside the root': () => {
      assert.equal(utils.resolveWithin('/srv/app', '/etc/passwd'), null);
    },

    'truncate leaves short input untouched': () => {
      assert.equal(utils.truncate('short', 100), 'short');
    },

    'truncate cuts long input and marks it': () => {
      const out = utils.truncate('x'.repeat(50), 10);
      assert.equal(out.startsWith('x'.repeat(10)), true);
      assert.match(out, /truncated 40 chars/);
    },

    'truncate coerces null to an empty string': () => {
      assert.equal(utils.truncate(null), '');
    },

    'isoDate returns a YYYY-MM-DD string': () => {
      assert.match(utils.isoDate(new Date('2026-09-04T12:34:56Z')), /^2026-09-04$/);
    },

    'timestamp returns a parseable ISO 8601 string': () => {
      assert.equal(Number.isNaN(Date.parse(utils.timestamp())), false);
    },

    'commandExists finds node and does not find a nonsense binary': () => {
      assert.equal(utils.commandExists('node'), true);
      assert.equal(utils.commandExists('definitely-not-a-real-binary-xyzzy'), false);
    },

    'runCapture returns stdout for a successful command': () => {
      const out = utils.runCapture(process.execPath, ['-e', 'process.stdout.write("hi")']);
      assert.equal(out, 'hi');
    },

    'runCapture returns the fallback when the command fails': () => {
      const out = utils.runCapture(process.execPath, ['-e', 'process.exit(3)'], { fallback: 'FB' });
      assert.equal(out, 'FB');
    },

    'runCapture returns the fallback when the binary does not exist': () => {
      assert.equal(utils.runCapture('no-such-binary-xyzzy', [], { fallback: null }), null);
    },

    'claudeDir and memoryDir are nested under the project root': () => {
      assert.equal(utils.claudeDir('/srv/app'), path.join('/srv/app', '.claude'));
      assert.equal(utils.memoryDir('/srv/app'), path.join('/srv/app', '.claude', 'memory'));
    },

    'projectDir honours CLAUDE_PROJECT_DIR when set': () => {
      const previous = process.env.CLAUDE_PROJECT_DIR;
      process.env.CLAUDE_PROJECT_DIR = '/tmp/some-project';
      try {
        assert.equal(utils.projectDir(), '/tmp/some-project');
      } finally {
        if (previous === undefined) delete process.env.CLAUDE_PROJECT_DIR;
        else process.env.CLAUDE_PROJECT_DIR = previous;
      }
    },

    'additionalContext builds the hook payload and returns null for empty text': () => {
      assert.deepEqual(utils.additionalContext('SessionStart', 'body'), {
        hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: 'body' },
      });
      assert.equal(utils.additionalContext('SessionStart', ''), null);
    },
  },
};
