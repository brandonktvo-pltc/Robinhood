# Rule: Security

Applies to every change. Not optional, not deferred to review.

## Never commit

- Credentials, API keys, tokens, private keys, or connection strings — in
  source, config, fixtures, tests, or comments
- `.env` files. `.env.example` carries variable **names** only
- Real customer or staff data in fixtures. Generate synthetic data
- Internal hostnames or IPs in public repos

If a secret is ever committed, **rotate it**. Removing it from HEAD does not
remove it from history, and history is what gets scraped.

## Always

- **Parameterize queries.** No string interpolation into SQL, ever, under any
  deadline
- **Validate at the trust boundary** with a schema, before any use. Type,
  length, range, format
- **Allowlist, not denylist.** Enumerate what is permitted
- **Check authorization on the object**, not just the route. `GET /orders/{id}`
  verifies the order belongs to the caller
- **Argument arrays for subprocesses.** Never `shell: true` with interpolated
  input
- **Resolve paths and assert containment** before opening a user-supplied path
- **`crypto.randomBytes` / `secrets` / `crypto/rand`** for anything
  security-relevant. Never `Math.random()`
- **argon2id or bcrypt** (cost ≥ 12) for passwords. Never SHA-family
- **Timing-safe comparison** for tokens and secrets

## Never

- Disable TLS verification, even in development. Use a proper local CA
- Hand-roll crypto
- `eval`, `Function()`, `pickle.loads`, `yaml.load` on untrusted input
- Return stack traces, SQL, or internal identifiers to a client
- Log secrets, tokens, or PII
- `CORS: *` together with credentials

## Before merging anything that touches a trust boundary

Run the `security-review` skill checklist and the `security-reviewer` agent.
Trust boundaries include: HTTP handlers, CLI arguments, environment variables,
message consumers, webhooks, file uploads, third-party responses, and any
database value originally written by a user.
