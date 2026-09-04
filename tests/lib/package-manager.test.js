'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

const pm = require('../../scripts/lib/package-manager');
const { withTempDir, writeFixture } = require('../helpers/harness');

module.exports = {
  name: 'lib/package-manager',
  cases: {
    'isSupported accepts the four known managers and rejects others': () => {
      for (const name of ['npm', 'pnpm', 'yarn', 'bun']) {
        assert.equal(pm.isSupported(name), true, name);
      }
      assert.equal(pm.isSupported('cargo'), false);
      assert.equal(pm.isSupported(''), false);
      assert.equal(pm.isSupported(undefined), false);
    },

    'commandsFor returns the full command table': () => {
      const commands = pm.commandsFor('pnpm');
      assert.equal(commands.install, 'pnpm install');
      assert.equal(commands.addDev, 'pnpm add -D');
      assert.equal(commands.exec, 'pnpm exec');
      assert.equal(commands.ci, 'pnpm install --frozen-lockfile');
    },

    'commandsFor returns a copy, so callers cannot mutate the table': () => {
      const first = pm.commandsFor('npm');
      first.install = 'tampered';
      assert.equal(pm.commandsFor('npm').install, 'npm install');
    },

    'commandsFor throws on an unsupported manager': () => {
      assert.throws(() => pm.commandsFor('cargo'), /Unsupported package manager/);
    },

    'runScript composes the run command per manager': () => {
      assert.equal(pm.runScript('npm', 'test'), 'npm run test');
      assert.equal(pm.runScript('pnpm', 'build'), 'pnpm run build');
      assert.equal(pm.runScript('yarn', 'lint'), 'yarn lint');
      assert.equal(pm.runScript('bun', 'dev'), 'bun run dev');
    },

    'fromLockfile detects each supported lockfile': () =>
      withTempDir((dir) => {
        const expectations = [
          ['pnpm-lock.yaml', 'pnpm'],
          ['yarn.lock', 'yarn'],
          ['package-lock.json', 'npm'],
          ['bun.lockb', 'bun'],
        ];
        for (const [file, expected] of expectations) {
          const sub = path.join(dir, expected);
          writeFixture(sub, file, '');
          assert.equal(pm.fromLockfile(sub), expected, file);
        }
      }),

    'fromLockfile prefers bun over the others when several are present': () =>
      withTempDir((dir) => {
        writeFixture(dir, 'package-lock.json', '{}');
        writeFixture(dir, 'yarn.lock', '');
        writeFixture(dir, 'bun.lockb', '');
        assert.equal(pm.fromLockfile(dir), 'bun');
      }),

    'fromLockfile returns null when there is no lockfile': () =>
      withTempDir((dir) => {
        assert.equal(pm.fromLockfile(dir), null);
      }),

    'lockfilesPresent lists every lockfile found': () =>
      withTempDir((dir) => {
        writeFixture(dir, 'pnpm-lock.yaml', '');
        writeFixture(dir, 'package-lock.json', '{}');
        const found = pm.lockfilesPresent(dir).map((entry) => entry.file);
        assert.deepEqual(found, ['pnpm-lock.yaml', 'package-lock.json']);
      }),

    'fromPackageJson reads the packageManager field and strips the version': () =>
      withTempDir((dir) => {
        writeFixture(dir, 'package.json', JSON.stringify({ packageManager: 'pnpm@9.1.0' }));
        assert.equal(pm.fromPackageJson(dir), 'pnpm');
      }),

    'fromPackageJson ignores an unsupported packageManager value': () =>
      withTempDir((dir) => {
        writeFixture(dir, 'package.json', JSON.stringify({ packageManager: 'cargo@1.0.0' }));
        assert.equal(pm.fromPackageJson(dir), null);
      }),

    'fromPackageJson returns null when there is no package.json': () =>
      withTempDir((dir) => {
        assert.equal(pm.fromPackageJson(dir), null);
      }),

    'savePreference then loadPreference round-trips': () =>
      withTempDir((dir) => {
        pm.savePreference('yarn', dir);
        assert.equal(pm.loadPreference(dir), 'yarn');
      }),

    'savePreference rejects an unsupported manager': () =>
      withTempDir((dir) => {
        assert.throws(() => pm.savePreference('cargo', dir), /Unsupported package manager/);
      }),

    'loadPreference ignores a corrupt preference file': () =>
      withTempDir((dir) => {
        writeFixture(dir, path.join('.claude', 'package-manager.json'), '{ broken');
        assert.equal(pm.loadPreference(dir), null);
      }),

    'loadPreference ignores a preference naming an unsupported manager': () =>
      withTempDir((dir) => {
        writeFixture(
          dir,
          path.join('.claude', 'package-manager.json'),
          JSON.stringify({ packageManager: 'cargo' })
        );
        assert.equal(pm.loadPreference(dir), null);
      }),

    'detect prefers a saved preference over the lockfile': () =>
      withTempDir((dir) => {
        writeFixture(dir, 'package-lock.json', '{}');
        pm.savePreference('pnpm', dir);
        const result = pm.detect(dir);
        assert.equal(result.packageManager, 'pnpm');
        assert.equal(result.source, 'preference');
      }),

    'detect prefers the packageManager field over the lockfile': () =>
      withTempDir((dir) => {
        writeFixture(dir, 'package-lock.json', '{}');
        writeFixture(dir, 'package.json', JSON.stringify({ packageManager: 'yarn@4.0.0' }));
        const result = pm.detect(dir);
        assert.equal(result.packageManager, 'yarn');
        assert.equal(result.source, 'packageManager-field');
      }),

    'detect falls back to the lockfile when nothing else is set': () =>
      withTempDir((dir) => {
        writeFixture(dir, 'pnpm-lock.yaml', '');
        const result = pm.detect(dir);
        assert.equal(result.packageManager, 'pnpm');
        assert.equal(result.source, 'lockfile');
      }),

    'detect flags a conflict when more than one lockfile is present': () =>
      withTempDir((dir) => {
        writeFixture(dir, 'pnpm-lock.yaml', '');
        writeFixture(dir, 'yarn.lock', '');
        const result = pm.detect(dir);
        assert.equal(result.conflict, true);
        assert.deepEqual(result.lockfiles, ['pnpm-lock.yaml', 'yarn.lock']);
      }),

    'detect always returns a supported manager and an installed flag': () =>
      withTempDir((dir) => {
        const result = pm.detect(dir);
        assert.equal(pm.isSupported(result.packageManager), true);
        assert.equal(typeof result.installed, 'boolean');
        assert.equal(result.conflict, false);
      }),

    'preferenceFile points at .claude/package-manager.json': () => {
      assert.equal(
        pm.preferenceFile('/srv/app'),
        path.join('/srv/app', '.claude', 'package-manager.json')
      );
    },
  },
};
