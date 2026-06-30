# PR Babysitter — Week One (Example Story)

*Anonymized production-style narrative for contributors. Replace with your real metrics via PR.*

## Context

- 4-person team, monorepo, Grok Build TUI + GitHub
- Pain: "can you rebase?" and "CI is red" Slack pings 10–15×/day

## Setup

- Pattern: [pr-babysitter](../patterns/pr-babysitter.md)
- Cadence: `/loop 5m` during work hours
- L2 assisted: minimal-fix + loop-verifier, no auto-merge

## What Worked

- **State file** (`pr-babysitter-state.md`) stopped duplicate fix attempts — attempt counter mattered
- Verifier on stronger model caught 2 over-broad diffs before PR comment
- Loop comments signed `🤖 Loop Engineering — PR Babysitter` — reviewers knew what to trust

## What Broke

- **Day 3**: Infinite fix loop on flaky e2e — loop tried code changes 4 times before human killed scheduler
  - **Fix**: Added flake classification to triage; max 3 attempts enforced in prompt
- **Day 5**: Notification fatigue — bot commented on every run even when nothing changed
  - **Fix**: Only comment when verdict APPROVE or ESCALATE_HUMAN

## Metrics (week 1)

| Metric | Before | After |
|--------|--------|-------|
| Slack CI/rebase pings | ~12/day | ~4/day |
| Mean time to first fix proposal | hours | ~25 min |
| Bad merges from loop | 0 | 0 |

## Lesson

Start L2 only after 3 days of state-only watching. The loop doesn't know a flake from a regression — you teach it in skills.