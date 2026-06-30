# Why We Killed Our CI Sweeper (After Day 4)

*Honest failure story — valuable for pattern design.*

## What Happened

- `/loop 5m` on red main during a flaky migration branch
- Token spend: ~8M tokens in 48h
- Loop proposed 11 PRs; 3 were symptom fixes; 1 broke prod config (caught in human review)

## Root Causes

1. **No L1 phase** — went straight to auto-fix
2. **Verifier same session** as implementer on half the runs
3. **No branch allowlist** — swept feature branches with known red CI
4. **No daily budget** — scheduler never paused

## What We Did

1. `scheduler_delete` all CI sweeper tasks
2. Switched to **event-driven** GitHub Action only on `main` failures
3. Re-enabled with:
   - Report-only for 1 week
   - Verifier as separate sub-agent
   - 2M token/day cap in LOOP.md
   - Branch allowlist: `main` only

## Lesson

CI sweeper is a high-leverage *entry* loop and a high-risk *unattended* loop. The pattern doc exists because we learned this the hard way.