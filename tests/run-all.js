#!/usr/bin/env node
'use strict';

/**
 * Test runner. Discovers every `*.test.js` under `tests/`, runs its cases, and
 * exits non-zero if any fail.
 *
 *   node tests/run-all.js              # everything
 *   node tests/run-all.js package      # only suites whose name matches
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const filter = process.argv[2] || null;

const GREEN = '\u001b[32m';
const RED = '\u001b[31m';
const DIM = '\u001b[2m';
const RESET = '\u001b[0m';
const paint = process.stdout.isTTY ? (c, s) => c + s + RESET : (_c, s) => s;

/** Every `*.test.js` under `dir`, recursively, sorted. */
function discover(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'helpers') continue;
      found.push(...discover(full));
    } else if (entry.name.endsWith('.test.js')) {
      found.push(full);
    }
  }
  return found.sort();
}

async function main() {
  const files = discover(ROOT);
  if (files.length === 0) {
    process.stdout.write('No test files found.\n');
    return 1;
  }

  let passed = 0;
  const failures = [];
  const started = Date.now();

  for (const file of files) {
    const suite = require(file);
    const suiteName = suite.name || path.relative(ROOT, file);

    if (filter && !suiteName.includes(filter) && !file.includes(filter)) continue;

    process.stdout.write('\n' + suiteName + ' ' + paint(DIM, path.relative(ROOT, file)) + '\n');

    for (const [caseName, fn] of Object.entries(suite.cases || {})) {
      try {
        await fn();
        passed += 1;
        process.stdout.write('  ' + paint(GREEN, 'PASS') + '  ' + caseName + '\n');
      } catch (err) {
        failures.push({ suiteName, caseName, err });
        process.stdout.write('  ' + paint(RED, 'FAIL') + '  ' + caseName + '\n');
      }
    }
  }

  const elapsed = Date.now() - started;
  process.stdout.write('\n' + '-'.repeat(60) + '\n');

  if (failures.length > 0) {
    process.stdout.write('\n' + failures.length + ' failure(s):\n');
    for (const { suiteName, caseName, err } of failures) {
      process.stdout.write('\n' + paint(RED, 'x') + ' ' + suiteName + ' > ' + caseName + '\n');
      const detail = err && err.stack ? err.stack : String(err);
      process.stdout.write(detail.split('\n').map((line) => '    ' + line).join('\n') + '\n');
    }
  }

  process.stdout.write(
    '\n' + passed + ' passed, ' + failures.length + ' failed  ' + paint(DIM, '(' + elapsed + 'ms)') + '\n'
  );

  return failures.length === 0 ? 0 : 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    process.stderr.write((err && err.stack ? err.stack : err) + '\n');
    process.exitCode = 1;
  });
