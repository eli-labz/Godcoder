# Multi-Loop Collision — CI Sweeper vs PR Babysitter on PR #318

## Setup

- CI Sweeper: `/loop 15m`, max 3 attempts
- PR Babysitter: `/loop 10m`, same repo
- Shared branch: `fix/auth-token-refresh` on PR #318

## What Worked

- Both loops correctly identified the failing `auth` test
- State files showed the overlap when we audited Tuesday morning

## What Broke

- CI Sweeper spawned a worktree fix at 14:02
- PR Babysitter spawned a **different** minimal fix on the same PR at 14:07
- Two commits, conflicting approaches, reviewer confused
- Combined token spend for that PR: ~400k (normally ~80k)

## Metrics

| Metric | Value |
|--------|-------|
| Duplicate fix attempts | 2 |
| Human minutes to untangle | 45 |
| Root cause | No `acting_on` collision check |

## Lesson

Action loops need a **branch lock** in state. We added collision detection to [multi-loop.md](../docs/multi-loop.md): read all pattern state files before spawning a worktree. CI Sweeper now owns red CI; PR Babysitter skips if `ci-sweeper-state.md` shows `acting_on` for that PR.