---
name: security-review
description: The security checklist applied before merging — input handling, injection, auth, secrets, dependencies, and data exposure. Use before any commit touching auth, user input, file I/O, subprocesses, or network calls.
---

# Security Review

Run this before merging anything that touches a trust boundary.

## 1. Trust boundaries

List every place external data enters: HTTP handlers, CLI arguments, environment
variables, message queues, webhooks, file uploads, third-party API responses,
and anything read from the database that was written by a user.

Everything in that list is hostile until validated.

## 2. Input validation

- [ ] Validated against a schema at the boundary, before any use
- [ ] Type, length, range and format bounds asserted
- [ ] Allowlist, not denylist — enumerate what is permitted
- [ ] Uploaded files: extension **and** content-type **and** magic bytes checked;
      size capped; stored outside the web root with a generated name
- [ ] Numeric input bounded before use in allocation, pagination, or arithmetic

## 3. Injection

- [ ] **SQL** — parameterized queries only. No interpolation. ORMs: verify the
      raw-query escape hatches are also parameterized
- [ ] **Command** — argument arrays (`execFile`, `subprocess.run([...])`).
      Never `shell: true` with interpolated input
- [ ] **Path** — resolve, then assert the resolved path is inside the intended
      root. `..` and absolute paths and symlinks all defeat naive checks
- [ ] **Template / HTML** — contextual escaping. No `innerHTML`,
      `dangerouslySetInnerHTML`, or `v-html` on untrusted data
- [ ] **Deserialization** — no `pickle`, `yaml.load`, `eval`, or `Function()` on
      untrusted input. `yaml.safe_load`, `JSON.parse`
- [ ] **Regex** — no user-supplied patterns; check your own for catastrophic
      backtracking

## 4. Authentication and authorization

- [ ] Every endpoint declares its auth requirement — no "protected by being
      unlisted"
- [ ] Authorization checked against the **object**, not just the route.
      `GET /orders/{id}` must verify the order belongs to the caller
- [ ] No IDOR: sequential ids are fine only if ownership is checked every time
- [ ] Passwords hashed with argon2id or bcrypt (cost ≥ 12). Never SHA-family,
      never unsalted
- [ ] Tokens: short-lived access, rotating refresh, revocable. Session fixation
      prevented by regenerating the session id on privilege change
- [ ] Rate limiting on auth endpoints, keyed to both account and source
- [ ] Timing-safe comparison for secrets and tokens

## 5. Secrets

- [ ] No credentials, API keys, tokens, private keys or connection strings in
      source, config, or test fixtures
- [ ] `.env` in `.gitignore`; `.env.example` carries names only, never values
- [ ] Secrets read from environment or a secret manager at runtime
- [ ] Never logged, never returned in an error, never sent to an error tracker
- [ ] If a secret was ever committed: rotate it. Removing it from HEAD does not
      remove it from history

## 6. Data exposure

- [ ] Client-facing errors are generic; detail goes to the log with a
      correlation id
- [ ] Serializers use explicit allowlists of fields
- [ ] Logs redact PII, tokens and payment data
- [ ] No sensitive data in URLs (they land in logs, referrers and history)
- [ ] CORS configured to a specific origin allowlist; never `*` with credentials

## 7. Dependencies and crypto

- [ ] `npm audit` / `pip-audit` / `govulncheck` clean of high and critical
- [ ] Lockfile committed; new dependencies justified and their maintenance
      checked
- [ ] Standard library crypto only. No hand-rolled primitives
- [ ] `crypto.randomBytes` / `secrets` / `crypto/rand` for anything
      security-relevant. Never `Math.random()`
- [ ] TLS verification never disabled

## 8. Transport and headers

- [ ] HTTPS enforced; HSTS set
- [ ] `Content-Security-Policy`, `X-Content-Type-Options: nosniff`,
      `Referrer-Policy`, `X-Frame-Options` / `frame-ancestors`
- [ ] Cookies `Secure`, `HttpOnly`, `SameSite=Lax` or stricter
- [ ] CSRF protection on cookie-authenticated state-changing requests

## Reporting

Each finding: severity, file and line, the attack path from attacker-controlled
input, the impact, and the specific fix. A finding without a reachable path is
hardening advice — label it as such and keep it separate.
