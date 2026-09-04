---
name: tdd-workflow
description: The test-driven development methodology used in this repo — red-green-refactor discipline, what to test, test structure, and coverage expectations. Use when implementing a feature test-first or when asked to add tests to existing code.
---

# TDD Workflow

## The loop

```
RED ──▶ GREEN ──▶ REFACTOR ──┐
 ▲                            │
 └────────────────────────────┘
```

**RED.** One failing test for the next smallest behavior. Run it. See it fail
for the reason you expect. A test that passes immediately is testing nothing —
or testing something already built.

**GREEN.** The minimum code to pass. Minimum is literal: return the constant if
one test allows it. Generality arrives when a second test demands it.

**REFACTOR.** Tests green throughout. Improve names, remove duplication, extract
functions. Run the suite after each step. Never refactor while red.

Never skip a phase. Never write two failing tests at once. Never write
implementation ahead of a test that requires it.

## What to test

**Test behavior through the public interface.** If a test breaks when you rename
a private method without changing behavior, it was testing the implementation.

Cover, per unit:
- The happy path
- Each boundary (empty, one, many, maximum)
- Each error path the code explicitly handles
- Each branch introduced by the change

Do not test: framework behavior, third-party library internals, getters and
setters with no logic, or generated code.

## Test structure

```ts
describe('parseDuration', () => {
  it('returns milliseconds for a plain seconds value', () => {
    // Arrange
    const input = '30s';

    // Act
    const result = parseDuration(input);

    // Assert
    expect(result).toBe(30_000);
  });

  it('throws on an unrecognised unit', () => {
    expect(() => parseDuration('30x')).toThrow(/unknown unit/i);
  });
});
```

- Test names state the behavior and the condition. `returns empty list when no
  matches`, not `test 2`.
- One behavior per test. Several assertions describing one behavior is fine.
- No logic in tests — no loops, no conditionals. A test with an `if` can pass
  without checking anything.
- Fresh fixtures per test. Shared mutable setup creates order dependence.

## Test doubles

- **Prefer real implementations.** An in-memory repository beats a mock of a
  repository, because it can be wrong in the same ways the real one can.
- Mock at the process boundary: network, clock, filesystem, randomness.
- Never mock the thing under test.
- Assert on outcomes, not on "was this method called". Call-count assertions
  couple the test to the implementation.

## Coverage

- **80% line coverage minimum** on changed code. New code without tests does not
  merge.
- Coverage is a floor, not a goal. 100% coverage with vacuous assertions is
  worse than 80% with real ones, because it hides the gap.
- Uncovered lines get one of two responses: a test, or a comment saying why it
  is untestable.

## Running

Establish the commands once and use them consistently:

```bash
<pm> test                 # full suite
<pm> test -- --watch      # during a cycle
<pm> test -- --coverage   # before a commit
```

Where `<pm>` is the project's package manager — run `/setup-pm` if it is not
yet configured.

**Paste real output.** Never assert that a test passes without having run it.
