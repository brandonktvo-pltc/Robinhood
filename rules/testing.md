# Rule: Testing

## Non-negotiable

- **New code ships with tests.** A feature branch with no test changes does not
  merge
- **80% line coverage minimum on changed code**
- **Never delete, skip, or weaken a test to get green.** If a test is wrong,
  fix the test and say why it was wrong
- **Never claim a test passes without running it.** Paste the real output

## Test-first

Default to TDD for new behavior:

1. **RED** — one failing test, run it, see it fail for the right reason
2. **GREEN** — minimum code to pass
3. **REFACTOR** — clean up on green, re-run

A test that passes the first time it runs is testing nothing. Delete it and
write a real one.

## What to test

Per unit: the happy path, each boundary (empty, one, many, maximum), each
handled error path, each new branch.

Do not test: framework behavior, third-party internals, trivial accessors,
generated code.

**Test behavior through the public interface.** A test that breaks when a
private method is renamed was testing the implementation.

## Structure

- Arrange / Act / Assert, in that order, visibly separated
- Test names state behavior and condition: `returns empty list when no matches`
- One behavior per test
- **No logic in tests** — no loops, no conditionals. A test with an `if` can
  pass without checking anything
- Fresh fixtures per test. Shared mutable setup creates order dependence
- Tests are independent and can run in any order, in parallel

## Doubles

- Prefer real implementations. An in-memory repository beats a mock of one
- Mock at the process boundary only: network, clock, filesystem, randomness
- Never mock the unit under test
- Assert on outcomes, not on call counts

## Before every commit

```bash
<pm> run lint
<pm> run typecheck
<pm> test
```

All three green. If a check does not exist in the project, say so — do not
silently skip it.
