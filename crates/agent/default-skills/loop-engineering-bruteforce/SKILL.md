---
name: loop-engineering-bruteforce
description: Use the vendored loop-engineering toolkit to scaffold, audit, and continuously improve autonomous loops in this GodCoder repository, and pair the result with the ResearchSwarm bridge for route/log/optimize memory.
---

# Loop Engineering Bruteforce Operator

Use this skill when you need to install and operationalize the local loop stack
in this repo: `third_party/loop-engineering-main` +
`third_party/ResearchSwarm-master`.

## Goal

Drive repeatable autonomous improvement loops in the GodCoder codebase by
combining:

- Loop design, scaffolding, audit, and cost tooling from loop-engineering.
- Persistent route/log/optimize feedback via the ResearchSwarm bridge.

## Baseline bootstrap (Windows)

From repo root:

```bash
tools\bootstrap-third-party-stack.bat
```

This installs dependencies for both third-party projects and validates:

- `godcoder_harness.py recall --limit 1`
- `node tools/loop-sync/dist/cli.js .`

## Bruteforce loop workflow

1. Route work through ResearchSwarm first:
```bash
py third_party/ResearchSwarm-master/godcoder_harness.py route "<objective>"
```

2. Initialize or refresh loop artifacts in the target folder:
```bash
cd third_party/loop-engineering-main
npx @cobusgreyling/loop-init .. --pattern daily-triage --tool codex
```

3. Audit readiness and collect fixes:
```bash
npx @cobusgreyling/loop-audit .. --suggest
```

4. Estimate token cost before escalating cadence:
```bash
npx @cobusgreyling/loop-cost --pattern daily-triage --level L1
```

5. Log concrete outcomes back to memory with stable tags:
```bash
py third_party/ResearchSwarm-master/godcoder_harness.py log --status success --tag loop:daily-triage --instruction "<objective>" --summary "<one-line result>"
```

6. Re-rank approaches and prefer the highest-yield tags:
```bash
py third_party/ResearchSwarm-master/godcoder_harness.py optimize
```

## Operating rules

- Keep one measurable change per iteration.
- Verify with build/test/audit before logging success.
- Reuse stable tags (`loop:<pattern>`) so optimize output remains sharp.
- For risky or ambiguous operations, keep the loop in report-only mode first.
