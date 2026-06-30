# Loop Budget — loop-engineering (reference repo)

> Dogfood file for the patterns that maintain this repository.

## Daily limits

| Loop | Max runs/day | Max tokens/day | Max sub-agent spawns/run |
|------|--------------|----------------|--------------------------|
| Daily Triage | 1 | 100k | 0 (L1) |
| Validate/Audit (CI) | 96 | 500k | 0 |
| Changelog Drafter | 1 | 100k | 2 |

## On budget exceed

1. Pause schedulers / disable high-cadence workflows
2. Append event to `loop-run-log.md`
3. Open maintainer issue

## Kill switch

- Label: `loop-pause-all`
- Resume only after cleared in `STATE.md`

## Estimate spend

```bash
npx @cobusgreyling/loop-cost --pattern daily-triage --level L1
```