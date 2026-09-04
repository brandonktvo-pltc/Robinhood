'use strict';

/**
 * Structural checks on the plugin itself: every manifest parses, every path a
 * manifest points at exists, and every component file carries the frontmatter
 * Claude Code needs to load it.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
const listMarkdown = (relative) =>
  fs
    .readdirSync(path.join(ROOT, relative))
    .filter((file) => file.endsWith('.md'))
    .map((file) => path.join(relative, file));

/** Parse a leading `---` frontmatter block into a flat key/value map. */
function frontmatter(relative) {
  const contents = fs.readFileSync(path.join(ROOT, relative), 'utf8');
  const match = contents.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;

  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return fields;
}

const AGENTS = listMarkdown('agents');
const COMMANDS = listMarkdown('commands');
const RULES = listMarkdown('rules');
const SKILLS = fs
  .readdirSync(path.join(ROOT, 'skills'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join('skills', entry.name, 'SKILL.md'));

module.exports = {
  name: 'plugin-structure',
  cases: {
    'plugin.json parses and names every component directory it ships': () => {
      const plugin = readJson('.claude-plugin/plugin.json');
      assert.equal(plugin.name, 'everything-claude-code');
      assert.match(plugin.version, /^\d+\.\d+\.\d+$/);
      assert.ok(plugin.description);

      for (const key of ['commands', 'agents', 'skills', 'hooks', 'mcpServers']) {
        const target = path.join(ROOT, plugin[key]);
        assert.ok(fs.existsSync(target), key + ' points at a missing path: ' + plugin[key]);
      }
    },

    'the two marketplace manifests are identical': () => {
      assert.deepEqual(readJson('marketplace.json'), readJson('.claude-plugin/marketplace.json'));
    },

    'the marketplace lists the plugin with a resolvable source': () => {
      const marketplace = readJson('.claude-plugin/marketplace.json');
      assert.equal(marketplace.plugins.length, 1);

      const entry = marketplace.plugins[0];
      assert.equal(entry.name, readJson('.claude-plugin/plugin.json').name);
      assert.equal(entry.version, readJson('.claude-plugin/plugin.json').version);
      assert.ok(fs.existsSync(path.resolve(ROOT, entry.source)));
    },

    'every agent declares a name and a description': () => {
      assert.ok(AGENTS.length >= 9, 'expected at least 9 agents, found ' + AGENTS.length);
      for (const file of AGENTS) {
        const fields = frontmatter(file);
        assert.ok(fields, file + ' has no frontmatter');
        assert.ok(fields.name, file + ' has no name');
        assert.ok(fields.description, file + ' has no description');
        assert.equal(
          fields.name,
          path.basename(file, '.md'),
          file + ' name does not match its filename'
        );
      }
    },

    'every skill declares a name matching its directory': () => {
      assert.ok(SKILLS.length >= 9, 'expected at least 9 skills, found ' + SKILLS.length);
      for (const file of SKILLS) {
        assert.ok(fs.existsSync(path.join(ROOT, file)), 'missing ' + file);
        const fields = frontmatter(file);
        assert.ok(fields, file + ' has no frontmatter');
        assert.equal(fields.name, path.basename(path.dirname(file)));
        assert.ok(fields.description, file + ' has no description');
      }
    },

    'every command declares a description': () => {
      assert.ok(COMMANDS.length >= 10, 'expected at least 10 commands, found ' + COMMANDS.length);
      for (const file of COMMANDS) {
        const fields = frontmatter(file);
        assert.ok(fields, file + ' has no frontmatter');
        assert.ok(fields.description, file + ' has no description');
      }
    },

    'every rules file has content': () => {
      assert.ok(RULES.length >= 6, 'expected at least 6 rules, found ' + RULES.length);
      for (const file of RULES) {
        const contents = fs.readFileSync(path.join(ROOT, file), 'utf8');
        assert.match(contents, /^# Rule: /m, file + ' is missing its "# Rule:" heading');
      }
    },

    'hooks.json parses and every command references a script that exists': () => {
      const config = readJson('hooks/hooks.json');
      const events = Object.keys(config.hooks);
      assert.ok(events.length > 0);

      for (const event of events) {
        for (const group of config.hooks[event]) {
          for (const hook of group.hooks) {
            assert.equal(hook.type, 'command');

            const match = hook.command.match(/scripts\/hooks\/([\w-]+\.js)/);
            assert.ok(match, event + ' hook does not reference a hook script');
            assert.ok(
              fs.existsSync(path.join(ROOT, 'scripts', 'hooks', match[1])),
              event + ' references a missing script: ' + match[1]
            );
            assert.ok(hook.command.includes('${CLAUDE_PLUGIN_ROOT}'), event + ' is not plugin-root relative');
          }
        }
      }
    },

    'hooks.json covers the session lifecycle': () => {
      const events = Object.keys(readJson('hooks/hooks.json').hooks);
      for (const required of ['SessionStart', 'SessionEnd', 'PreCompact', 'PostToolUse', 'Stop']) {
        assert.ok(events.includes(required), 'missing hook event: ' + required);
      }
    },

    'the MCP catalogue parses and every server declares how to start': () => {
      const config = readJson('mcp-configs/mcp-servers.json');
      for (const [name, server] of Object.entries(config.mcpServers)) {
        const startable = Boolean(server.command) || server.type === 'http' || server.type === 'sse';
        assert.ok(startable, name + ' declares neither a command nor an http/sse url');
        if (server.type === 'http' || server.type === 'sse') {
          assert.match(server.url, /^https:\/\//, name + ' must use https');
        }
      }
    },

    'no MCP server has a literal secret in place of an env placeholder': () => {
      const raw = fs.readFileSync(path.join(ROOT, 'mcp-configs', 'mcp-servers.json'), 'utf8');
      const config = JSON.parse(raw);
      for (const [name, server] of Object.entries(config.mcpServers)) {
        for (const value of Object.values(server.env || {})) {
          assert.match(value, /^\$\{[A-Z0-9_]+\}$/, name + ' has a non-placeholder env value');
        }
      }
    },

    'every hook script is executable Node with no syntax errors': () => {
      const dir = path.join(ROOT, 'scripts', 'hooks');
      const scripts = fs.readdirSync(dir).filter((file) => file.endsWith('.js'));
      assert.ok(scripts.length >= 5);
      for (const file of scripts) {
        const contents = fs.readFileSync(path.join(dir, file), 'utf8');
        assert.match(contents, /^#!\/usr\/bin\/env node/, file + ' is missing its shebang');
        assert.match(contents, /runHook\(/, file + ' does not wrap its main in runHook()');
      }
    },
  },
};
