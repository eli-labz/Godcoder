# Sample Loop Budget Tracking

Following `templates/loop-budget.md.template`.

## Current Period (example week)

| Loop | Runs | Tokens (est.) | Sub-agents spawned | Budget Used |
|------|------|---------------|--------------------|-------------|
| Daily Triage | 5 | 212k | 0 (L1) | 21% of daily cap |
| Changelog Drafter | 3 | 71k | 2 | 14% of daily cap |
| Post-Merge Cleanup | 2 | 41k | 3 | 20% of daily cap |

## Alerts This Period
- 2026-06-08: Daily Triage hit 85% of token budget for the day → cadence automatically slowed to 2h for the rest of the window (via scheduler adjustment in the loop prompt).

## Kill Switch Usage
- None this period.

## Recommendations
- Increase Daily Triage token cap slightly if L2 assisted fixes are enabled (more verifier work).
- Changelog Drafter is extremely cheap relative to value — consider running it more frequently during release weeks.
- Keep Post-Merge off-peak only.

Update this file (or a living version in your project root) whenever you adjust budgets in LOOP.md or the scheduler. The loop itself can append a line when it self-throttles.
