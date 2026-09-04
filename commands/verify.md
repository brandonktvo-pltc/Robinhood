---
description: Run the verification ladder and report real output at each rung
argument-hint: [optional: rung to stop at — lint, typecheck, test, build, e2e]
allowed-tools: Read, Grep, Glob, Bash
---

# /verify

Stop at: **$ARGUMENTS** (empty means run the full ladder)

## Available scripts

!`node -e "try{const p=require('./package.json');const s=p.scripts||{};for(const k of Object.keys(s))console.log(k+': '+s[k])}catch(e){console.log('(no package.json)')}" 2>/dev/null`

## Instructions

Follow the `verification-loop` skill. Run from cheapest to most expensive and
**stop at the first red rung** — diagnose and report rather than continuing.

| Rung | Check |
| --- | --- |
| 1 | format / lint |
| 2 | typecheck |
| 3 | unit tests |
| 4 | integration tests |
| 5 | build |
| 6 | E2E |

Use the project's own commands via its configured package manager. Skip a rung
only if the project genuinely does not have it — and say which rungs were
skipped and why.

Report:

```
RUNG        COMMAND                 RESULT
lint        <cmd>                   PASS / FAIL / N/A
typecheck   <cmd>                   ...
```

Paste real output — the pass counts on success, the first real error on failure.
Do not summarize output you did not capture. Anything unverified is reported as
unverified, never rounded up to "done".

Finish by offering to run `/checkpoint` to record the result.
