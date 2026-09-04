'use strict';

/**
 * Package manager detection and command resolution.
 *
 * Precedence, highest first:
 *   1. saved preference   .claude/package-manager.json
 *   2. packageManager     field in package.json (corepack convention)
 *   3. lockfile           bun.lock(b) > pnpm-lock.yaml > yarn.lock > package-lock.json
 *   4. installed binary   first of bun, pnpm, yarn, npm found on PATH
 *   5. fallback           npm
 */

const path = require('node:path');
const {
  claudeDir,
  commandExists,
  pathExists,
  projectDir,
  readJson,
  writeJson,
} = require('./utils');

const SUPPORTED = ['npm', 'pnpm', 'yarn', 'bun'];

/** Lockfiles in detection priority order. */
const LOCKFILES = [
  { file: 'bun.lockb', pm: 'bun' },
  { file: 'bun.lock', pm: 'bun' },
  { file: 'pnpm-lock.yaml', pm: 'pnpm' },
  { file: 'yarn.lock', pm: 'yarn' },
  { file: 'package-lock.json', pm: 'npm' },
];

/** Command templates per manager. */
const COMMANDS = {
  npm: {
    install: 'npm install',
    ci: 'npm ci',
    add: 'npm install',
    addDev: 'npm install --save-dev',
    remove: 'npm uninstall',
    run: 'npm run',
    exec: 'npx',
    test: 'npm test',
    dlx: 'npx',
  },
  pnpm: {
    install: 'pnpm install',
    ci: 'pnpm install --frozen-lockfile',
    add: 'pnpm add',
    addDev: 'pnpm add -D',
    remove: 'pnpm remove',
    run: 'pnpm run',
    exec: 'pnpm exec',
    test: 'pnpm test',
    dlx: 'pnpm dlx',
  },
  yarn: {
    install: 'yarn install',
    ci: 'yarn install --frozen-lockfile',
    add: 'yarn add',
    addDev: 'yarn add --dev',
    remove: 'yarn remove',
    run: 'yarn',
    exec: 'yarn exec',
    test: 'yarn test',
    dlx: 'yarn dlx',
  },
  bun: {
    install: 'bun install',
    ci: 'bun install --frozen-lockfile',
    add: 'bun add',
    addDev: 'bun add -d',
    remove: 'bun remove',
    run: 'bun run',
    exec: 'bunx',
    test: 'bun test',
    dlx: 'bunx',
  },
};

/** True if `name` is a package manager this plugin knows about. */
function isSupported(name) {
  return SUPPORTED.includes(name);
}

/** Path to the saved-preference file for a project root. */
function preferenceFile(root) {
  return path.join(claudeDir(root || projectDir()), 'package-manager.json');
}

/** The saved preference, or null when unset or invalid. */
function loadPreference(root) {
  const saved = readJson(preferenceFile(root));
  if (saved && isSupported(saved.packageManager)) return saved.packageManager;
  return null;
}

/** Persist a preference. Throws on an unsupported name. */
function savePreference(name, root) {
  if (!isSupported(name)) {
    throw new Error(`Unsupported package manager: ${name}. Expected one of ${SUPPORTED.join(', ')}.`);
  }
  const file = preferenceFile(root);
  writeJson(file, {
    packageManager: name,
    updatedAt: new Date().toISOString(),
  });
  return file;
}

/** Read the `packageManager` field from package.json, e.g. "pnpm@9.1.0" -> "pnpm". */
function fromPackageJson(root) {
  const pkg = readJson(path.join(root || projectDir(), 'package.json'));
  const field = pkg && typeof pkg.packageManager === 'string' ? pkg.packageManager : null;
  if (!field) return null;
  const name = field.split('@')[0].trim();
  return isSupported(name) ? name : null;
}

/** Every lockfile present in the project, in detection priority order. */
function lockfilesPresent(root) {
  const base = root || projectDir();
  return LOCKFILES.filter((entry) => pathExists(path.join(base, entry.file)));
}

/** The manager implied by the highest-priority lockfile, or null. */
function fromLockfile(root) {
  const found = lockfilesPresent(root);
  return found.length > 0 ? found[0].pm : null;
}

/** The first supported manager installed on PATH, or null. */
function fromInstalled() {
  for (const name of ['bun', 'pnpm', 'yarn', 'npm']) {
    if (commandExists(name)) return name;
  }
  return null;
}

/**
 * Resolve the package manager for a project.
 * Returns `{ packageManager, source, lockfiles, conflict, installed }`.
 */
function detect(root) {
  const base = root || projectDir();
  const locks = lockfilesPresent(base).map((entry) => entry.file);

  const candidates = [
    ['preference', loadPreference(base)],
    ['packageManager-field', fromPackageJson(base)],
    ['lockfile', fromLockfile(base)],
    ['installed', fromInstalled()],
  ];

  for (const [source, value] of candidates) {
    if (value) {
      return {
        packageManager: value,
        source,
        lockfiles: locks,
        conflict: locks.length > 1,
        installed: commandExists(value),
      };
    }
  }

  return {
    packageManager: 'npm',
    source: 'fallback',
    lockfiles: locks,
    conflict: locks.length > 1,
    installed: commandExists('npm'),
  };
}

/** The command table for a manager. Throws on an unsupported name. */
function commandsFor(name) {
  if (!isSupported(name)) {
    throw new Error(`Unsupported package manager: ${name}. Expected one of ${SUPPORTED.join(', ')}.`);
  }
  return { ...COMMANDS[name] };
}

/** Build a runnable command string, e.g. runScript('pnpm', 'test') -> 'pnpm run test'. */
function runScript(name, script) {
  return `${commandsFor(name).run} ${script}`.trim();
}

module.exports = {
  COMMANDS,
  LOCKFILES,
  SUPPORTED,
  commandsFor,
  detect,
  fromInstalled,
  fromLockfile,
  fromPackageJson,
  isSupported,
  loadPreference,
  lockfilesPresent,
  preferenceFile,
  runScript,
  savePreference,
};
