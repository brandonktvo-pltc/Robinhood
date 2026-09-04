#!/usr/bin/env node
'use strict';

/**
 * Detect and configure the package manager for the current project.
 *
 * Usage:
 *   node scripts/setup-package-manager.js            # interactive
 *   node scripts/setup-package-manager.js --detect   # report only, write nothing
 *   node scripts/setup-package-manager.js --auto     # detect and save
 *   node scripts/setup-package-manager.js --set pnpm # save an explicit choice
 *   node scripts/setup-package-manager.js --json     # machine-readable detection
 */

const readline = require('node:readline');
const path = require('node:path');
const {
  SUPPORTED,
  commandsFor,
  detect,
  isSupported,
  preferenceFile,
  savePreference,
} = require('./lib/package-manager');
const { commandExists, projectDir } = require('./lib/utils');

const SOURCE_LABELS = {
  preference: 'saved preference',
  'packageManager-field': '"packageManager" field in package.json',
  lockfile: 'lockfile',
  installed: 'installed binary',
  fallback: 'fallback default',
};

function parseArgs(argv) {
  const args = { mode: 'interactive', set: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--detect') args.mode = 'detect';
    else if (arg === '--auto') args.mode = 'auto';
    else if (arg === '--json') args.mode = 'json';
    else if (arg === '--help' || arg === '-h') args.mode = 'help';
    else if (arg === '--set') {
      args.mode = 'set';
      args.set = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--set=')) {
      args.mode = 'set';
      args.set = arg.slice('--set='.length);
    } else if (!arg.startsWith('-') && args.mode === 'interactive') {
      args.mode = 'set';
      args.set = arg;
    }
  }
  return args;
}

function usage() {
  return [
    'setup-package-manager — detect and configure this project\'s package manager',
    '',
    'Options:',
    '  --detect        Report detection results, write nothing',
    '  --auto          Detect and save the result',
    '  --set <pm>      Save an explicit choice (npm | pnpm | yarn | bun)',
    '  --json          Emit detection as JSON',
    '  --help          Show this message',
  ].join('\n');
}

function report(result, root) {
  const lines = [];
  lines.push(`Package manager: ${result.packageManager}`);
  lines.push(`Detected via:    ${SOURCE_LABELS[result.source] || result.source}`);
  lines.push(`Lockfiles:       ${result.lockfiles.length ? result.lockfiles.join(', ') : 'none'}`);
  lines.push(`Installed:       ${result.installed ? 'yes' : 'NO — not found on PATH'}`);

  if (result.conflict) {
    lines.push('');
    lines.push(`WARNING: ${result.lockfiles.length} lockfiles present. Mixing package managers`);
    lines.push('corrupts dependency resolution. Delete all but the authoritative one.');
  }

  if (!result.installed) {
    lines.push('');
    lines.push(`WARNING: ${result.packageManager} is not on PATH. Install it before use:`);
    lines.push(`  ${installHint(result.packageManager)}`);
  }

  const commands = commandsFor(result.packageManager);
  lines.push('');
  lines.push('Commands:');
  for (const [key, value] of Object.entries(commands)) {
    lines.push(`  ${key.padEnd(8)} ${value}`);
  }

  lines.push('');
  lines.push(`Preference file: ${path.relative(root, preferenceFile(root)) || preferenceFile(root)}`);

  return lines.join('\n');
}

function installHint(name) {
  switch (name) {
    case 'pnpm':
      return 'corepack enable pnpm   (or: npm install -g pnpm)';
    case 'yarn':
      return 'corepack enable yarn   (or: npm install -g yarn)';
    case 'bun':
      return 'curl -fsSL https://bun.sh/install | bash   (see bun.sh for Windows)';
    default:
      return 'install Node.js, which bundles npm — https://nodejs.org';
  }
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function interactive(root, detected) {
  process.stdout.write(`${report(detected, root)}\n\n`);

  if (!process.stdin.isTTY) {
    process.stdout.write('Not a TTY — run with --auto or --set <pm> to write a preference.\n');
    return 0;
  }

  const options = SUPPORTED.map(
    (name, index) =>
      `  ${index + 1}) ${name.padEnd(5)} ${commandExists(name) ? '(installed)' : '(not installed)'}`
  ).join('\n');

  const answer = await ask(
    `Select a package manager for this project:\n${options}\n` +
      `  [Enter] keep ${detected.packageManager}\n> `
  );

  if (!answer) {
    savePreference(detected.packageManager, root);
    process.stdout.write(`Saved: ${detected.packageManager}\n`);
    return 0;
  }

  const index = Number.parseInt(answer, 10);
  const chosen = Number.isInteger(index) && index >= 1 && index <= SUPPORTED.length
    ? SUPPORTED[index - 1]
    : answer;

  if (!isSupported(chosen)) {
    process.stderr.write(`Unsupported: ${chosen}. Expected one of ${SUPPORTED.join(', ')}.\n`);
    return 1;
  }

  savePreference(chosen, root);
  process.stdout.write(`Saved: ${chosen}\n`);
  return 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = projectDir();

  if (args.mode === 'help') {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }

  const detected = detect(root);

  if (args.mode === 'json') {
    process.stdout.write(`${JSON.stringify({ ...detected, commands: commandsFor(detected.packageManager) }, null, 2)}\n`);
    return 0;
  }

  if (args.mode === 'detect') {
    process.stdout.write(`${report(detected, root)}\n`);
    return 0;
  }

  if (args.mode === 'auto') {
    if (detected.conflict) {
      process.stderr.write(
        `Refusing to auto-save: multiple lockfiles present (${detected.lockfiles.join(', ')}).\n` +
          'Resolve the conflict, or choose explicitly with --set <pm>.\n'
      );
      return 1;
    }
    savePreference(detected.packageManager, root);
    process.stdout.write(`${report(detect(root), root)}\nSaved: ${detected.packageManager}\n`);
    return 0;
  }

  if (args.mode === 'set') {
    if (!isSupported(args.set)) {
      process.stderr.write(
        `Unsupported package manager: ${args.set || '(none given)'}. ` +
          `Expected one of ${SUPPORTED.join(', ')}.\n`
      );
      return 1;
    }
    savePreference(args.set, root);
    process.stdout.write(`${report(detect(root), root)}\nSaved: ${args.set}\n`);
    return 0;
  }

  return interactive(root, detected);
}

main()
  .then((code) => {
    process.exitCode = code || 0;
  })
  .catch((err) => {
    process.stderr.write(`setup-package-manager: ${err && err.message ? err.message : err}\n`);
    process.exitCode = 1;
  });
