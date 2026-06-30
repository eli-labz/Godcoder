# L1 → L2 Graduation — When We Turned On Auto-Fix

## Setup

- Pattern: Daily Triage
- Week 1–2: L1 report-only, `/loop 1d`
- Week 3: L2 assisted small fixes with verifier

## What Worked

- L1 taught us which items were **actually** high priority vs noise
- Triage accuracy improved from ~60% to ~85% before we enabled fixes
- First L2 win: broken internal doc link fixed overnight, zero human minutes

## What Broke

- Week 2 false positive: triage marked a flaky E2E as high priority three days running
- We almost enabled L2 while still misclassifying flakes — would have produced junk PRs
- L2 day 2: loop "fixed" a typo in a generated file that should not be edited

## Metrics

| Phase | Runs | Auto-fixes | Human escalations |
|-------|------|------------|-------------------|
| L1 (2 weeks) | 14 | 0 | 3 |
| L2 (week 3) | 7 | 4 | 2 |

## Lesson

Graduation criteria we now use:

1. Two weeks of L1 with <20% noise in High Priority
2. Verifier + worktree proven on **manual** fix attempts first
3. Denylist and `AGENTS.md` test commands documented
4. `loop-audit` score ≥ 58 before L2

Do not skip L1 because L2 feels more impressive. The report-only phase is the calibration phase.