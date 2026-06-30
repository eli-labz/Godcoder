# Dependency Sweeper Week One — Patch Volume and a Verifier Lie

## Setup

- Pattern: Dependency Sweeper (L2 patch-only)
- Cadence: `/loop 6h`
- Denylist: `react`, `@company/core-auth`
- Verifier: `loop-verifier` in isolated worktree

## What Worked

- Patch bumps for transitive lodash CVE closed in 4 hours without human touch
- State file made it obvious what was in-flight vs waiting on human
- Denylist prevented a reckless React minor during a release freeze

## What Broke

- Day 3: verifier APPROVED an `express` patch but **did not run** `npm ci` — only `npm test`, which used cached `node_modules`
- CI failed on the PR with a peer dependency conflict the verifier missed
- Day 4: loop opened 3 patch PRs in one run — reviewer fatigue

## Metrics

| Metric | Week 1 |
|--------|--------|
| Patch PRs opened | 11 |
| Human merges | 7 |
| Verifier false APPROVE | 1 |
| Token estimate | ~800k |

## Lesson

Patch-only is not "risk-free." Verifier must run the **same install path as CI** (`npm ci`, not `npm test` alone). Cap auto-PRs per day (we added max 5 to LOOP.md). One false APPROVE cost more human time than a week of manual patches would have.