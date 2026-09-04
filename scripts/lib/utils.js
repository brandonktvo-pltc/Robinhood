'use strict';

/**
 * Cross-platform utilities shared by the plugin's hooks and scripts.
 *
 * Everything here avoids shelling out where Node can do the job, so the same
 * code path runs on Linux, macOS and Windows.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const IS_WINDOWS = process.platform === 'win32';

/** Absolute path to the user's home directory. */
function homeDir() {
  return os.homedir();
}

/**
 * The project root Claude Code is operating in.
 * Falls back to cwd when the hook environment variable is absent.
 */
function projectDir() {
  return process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

/** The installed plugin's root directory. */
function pluginDir() {
  return process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..', '..');
}

/** `<project>/.claude` — where per-project Claude state lives. */
function claudeDir(root) {
  return path.join(root || projectDir(), '.claude');
}

/** `<project>/.claude/memory` — where this plugin persists session state. */
function memoryDir(root) {
  return path.join(claudeDir(root), 'memory');
}

/** True if the path exists. Never throws. */
function pathExists(target) {
  try {
    fs.accessSync(target);
    return true;
  } catch {
    return false;
  }
}

/** Create a directory and its parents. Returns the directory. */
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Read a UTF-8 file, returning `fallback` if it is missing or unreadable. */
function readText(file, fallback = null) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return fallback;
  }
}

/** Write a UTF-8 file, creating parent directories as needed. */
function writeText(file, contents) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, contents, 'utf8');
  return file;
}

/** Append to a UTF-8 file, creating it and its parents as needed. */
function appendText(file, contents) {
  ensureDir(path.dirname(file));
  fs.appendFileSync(file, contents, 'utf8');
  return file;
}

/** Read and parse JSON, returning `fallback` on any failure. */
function readJson(file, fallback = null) {
  const raw = readText(file);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** Serialize and write JSON with a trailing newline. */
function writeJson(file, value) {
  return writeText(file, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Resolve `candidate` against `root` and confirm it stays inside `root`.
 * Returns the resolved path, or null if it escapes.
 */
function resolveWithin(root, candidate) {
  const base = path.resolve(root);
  const resolved = path.resolve(base, candidate);
  if (resolved === base) return resolved;
  return resolved.startsWith(base + path.sep) ? resolved : null;
}

/** True if `name` is an executable on PATH. */
function commandExists(name) {
  const probe = IS_WINDOWS ? 'where' : 'which';
  try {
    execFileSync(probe, [name], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Run a command and return its trimmed stdout, or `fallback` on any failure.
 * Uses an argument array — never a shell string.
 */
function runCapture(cmd, args = [], options = {}) {
  const { fallback = null, cwd = projectDir(), timeout = 10_000 } = options;
  try {
    return execFileSync(cmd, args, {
      cwd,
      timeout,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    }).trim();
  } catch {
    return fallback;
  }
}

/** Current git branch, or null outside a repository. */
function gitBranch(cwd) {
  return runCapture('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: cwd || projectDir(),
  });
}

/** Porcelain status lines as an array. Empty array when clean or not a repo. */
function gitStatus(cwd) {
  const out = runCapture('git', ['status', '--porcelain'], {
    cwd: cwd || projectDir(),
    fallback: '',
  });
  return out ? out.split('\n').filter(Boolean) : [];
}

/** ISO 8601 timestamp. */
function timestamp(date = new Date()) {
  return date.toISOString();
}

/** `YYYY-MM-DD` for the given date. */
function isoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/** Truncate to `max` characters, appending an ellipsis marker when cut. */
function truncate(text, max = 2000) {
  const str = String(text ?? '');
  if (str.length <= max) return str;
  return `${str.slice(0, max)}\n… [truncated ${str.length - max} chars]`;
}

/**
 * Read the JSON payload Claude Code writes to a hook's stdin.
 * Resolves to `{}` when stdin is empty, closed, or not valid JSON — a hook
 * must never crash the session because of its input.
 */
function readHookInput() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve({});
      return;
    }

    let raw = '';
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        resolve(raw.trim() ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    };

    const timer = setTimeout(finish, 2000);
    timer.unref?.();

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      raw += chunk;
    });
    process.stdin.on('end', finish);
    process.stdin.on('error', finish);
  });
}

/**
 * Emit a hook result on stdout as JSON and exit 0.
 * Passing a falsy value emits nothing, which Claude Code reads as "no opinion".
 */
function emit(result) {
  if (result) process.stdout.write(`${JSON.stringify(result)}\n`);
}

/**
 * Build a `hookSpecificOutput` payload that injects extra context into the
 * conversation. Valid for SessionStart, UserPromptSubmit and PreCompact.
 */
function additionalContext(hookEventName, text) {
  if (!text) return null;
  return {
    hookSpecificOutput: {
      hookEventName,
      additionalContext: text,
    },
  };
}

/**
 * Wrap a hook's main function so any unexpected error is reported on stderr
 * and the process still exits 0. A broken hook must not block the session.
 */
function runHook(name, main) {
  Promise.resolve()
    .then(main)
    .catch((err) => {
      process.stderr.write(`[${name}] ${err && err.message ? err.message : err}\n`);
    })
    .finally(() => {
      process.exitCode = 0;
    });
}

module.exports = {
  IS_WINDOWS,
  additionalContext,
  appendText,
  claudeDir,
  commandExists,
  emit,
  ensureDir,
  gitBranch,
  gitStatus,
  homeDir,
  isoDate,
  memoryDir,
  pathExists,
  pluginDir,
  projectDir,
  readHookInput,
  readJson,
  readText,
  resolveWithin,
  runCapture,
  runHook,
  timestamp,
  truncate,
  writeJson,
  writeText,
};
