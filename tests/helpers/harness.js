'use strict';

/**
 * A dependency-free test harness.
 *
 * A test module exports `{ name, cases }` where `cases` maps a behavior
 * description to a function. The function throws to fail — `node:assert` is the
 * assertion library. Async functions are awaited.
 *
 *   module.exports = {
 *     name: 'utils',
 *     cases: {
 *       'truncate leaves short strings alone': () => {
 *         assert.equal(truncate('hi', 10), 'hi');
 *       },
 *     },
 *   };
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

/** Create an isolated temp directory. Returns `{ dir, cleanup }`. */
function tempDir(prefix = 'ecc-test-') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return {
    dir,
    cleanup() {
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** Run a function with a fresh temp directory, cleaning up afterwards. */
async function withTempDir(fn) {
  const { dir, cleanup } = tempDir();
  try {
    return await fn(dir);
  } finally {
    cleanup();
  }
}

/** Write a file inside `dir`, creating parents. */
function writeFixture(dir, relativePath, contents) {
  const file = path.join(dir, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents, 'utf8');
  return file;
}

/** Run a Node script, capturing stdout, stderr and the exit status. */
function spawnNode(scriptPath, args = [], options = {}) {
  try {
    const stdout = execFileSync(process.execPath, [scriptPath, ...args], {
      input: options.input ?? '',
      cwd: options.cwd || path.dirname(scriptPath),
      encoding: 'utf8',
      timeout: 20000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { status: 0, stdout, stderr: '' };
  } catch (err) {
    return {
      status: typeof err.status === 'number' ? err.status : 1,
      stdout: err.stdout ? String(err.stdout) : '',
      stderr: err.stderr ? String(err.stderr) : String(err.message || err),
    };
  }
}

/**
 * Run a hook script with a JSON payload on stdin.
 * Returns `{ status, stdout, stderr, json }` — `json` is the parsed stdout, or
 * null when the hook emitted nothing.
 */
function runHookScript(scriptPath, payload = {}, options = {}) {
  const result = spawnNode(scriptPath, [], {
    input: JSON.stringify(payload) + '\n',
    cwd: options.cwd,
  });

  let json = null;
  if (result.stdout.trim()) {
    try {
      json = JSON.parse(result.stdout);
    } catch {
      json = null;
    }
  }

  return { ...result, json };
}

/** Set env vars for the duration of `fn`, restoring them afterwards. */
async function withEnv(vars, fn) {
  const previous = {};
  for (const [key, value] of Object.entries(vars)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

module.exports = { runHookScript, spawnNode, tempDir, withEnv, withTempDir, writeFixture };
