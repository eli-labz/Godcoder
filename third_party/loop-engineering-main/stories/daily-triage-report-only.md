# Daily Triage — Report-Only Onboarding

## Context

Team wanted morning visibility without risking auto-edits on day one.

## Setup

- [minimal-loop starter](../starters/minimal-loop/)
- `/loop 1d` — triage only, no sub-agents
- Human reads `STATE.md` with coffee

## Week 1 Results

- 5/5 weekdays: STATE.md matched what on-call would have found manually
- 2 false positives: Dependabot grouped as high priority → tuned triage skill "Noise" section
- 0 tokens burned on implementer/verifier

## Graduation to L2

After 10 stable runs:

1. Added `minimal-fix` + `loop-verifier` skills
2. Narrow rule: "single-file test failures only"
3. First auto-PR merged with human LGTM in 8 minutes

## Lesson

Report-only is not wasted time — it calibrates triage. Skipping L1 is how loops get a reputation for noise.