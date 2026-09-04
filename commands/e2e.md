---
description: Write and run Playwright end-to-end tests for a user flow
argument-hint: [user flow to cover]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Task
---

# /e2e

Cover this flow with end-to-end tests: **$ARGUMENTS**

## Project state

- Playwright config: !`ls playwright.config.* 2>/dev/null || echo "(none found)"`
- Existing specs: !`ls -1 e2e tests/e2e 2>/dev/null | head -20 || echo "(none found)"`

## Instructions

Delegate to the `e2e-runner` agent.

1. **Detect or scaffold.** If Playwright is not set up, install it with the
   project's configured package manager (`/setup-pm` if unset) and create a
   minimal config with a `webServer` block so runs are reproducible.
2. **Write the spec.** Role-based locators first (`getByRole`, `getByLabel`).
   Web-first assertions only — `waitForTimeout` is banned. One user journey per
   test, independent, with unique per-run data.
3. **Run it.** Paste the real output.
4. **On failure**, read the trace before changing anything, and state explicitly
   whether the test is wrong or the app is wrong.

Never loosen an assertion to make a test pass, and never `test.skip` a flaky
test — fix the race or the locator.
