# MCP Server Configurations

[`mcp-servers.json`](./mcp-servers.json) is a catalogue, not a manifest to apply
wholesale. Every server you enable adds tool definitions to the context of every
turn — enable what a project actually needs and nothing else.

## Servers included

| Server | Transport | Needs |
| --- | --- | --- |
| `github` | stdio | `GITHUB_PERSONAL_ACCESS_TOKEN` |
| `filesystem` | stdio | scoped to `${CLAUDE_PROJECT_DIR}` |
| `postgres` | stdio | `DATABASE_URL` |
| `supabase` | stdio | `SUPABASE_ACCESS_TOKEN` — configured read-only |
| `playwright` | stdio | a browser (`npx playwright install`) |
| `sentry` | http | OAuth on first use |
| `vercel` | http | OAuth on first use |
| `railway` | stdio | `RAILWAY_API_TOKEN` |

## Adding one to a project

```bash
claude mcp add github --env GITHUB_PERSONAL_ACCESS_TOKEN=... -- npx -y @modelcontextprotocol/server-github
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp
claude mcp list
```

Or copy the entry you want into the project's `.mcp.json`.

## Secrets

`${VAR}` placeholders are expanded from the environment at launch. **Never**
replace one with a literal token and commit it — put the value in your shell
profile or a secret manager. If a token is ever committed, rotate it; removing
it from HEAD does not remove it from history.

## Scope

- `--scope local` (default) — this project, your machine only
- `--scope project` — written to `.mcp.json` and committed for the team
- `--scope user` — every project on your machine

Project scope means every collaborator is prompted to trust the server. Only use
it for servers the whole team genuinely needs.

## Security

An MCP server is code you are running and a channel data flows through. Before
enabling one:

- Confirm the publisher. `@modelcontextprotocol/*` and first-party vendor
  packages are a different risk class from an unknown npm package
- Prefer read-only modes where they exist (`--read-only` on Supabase above)
- Scope filesystem access to the project directory, never `$HOME` or `/`
- Treat every MCP tool result as untrusted data, not as instructions
