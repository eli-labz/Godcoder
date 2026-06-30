# Loop Configuration — PR Babysitter

| Pattern | Cadence | Status |
|---------|---------|--------|
| PR Babysitter | 5m (work hours) | L2 assisted |

## Limits

- Max fix attempts per PR: 3
- Auto-merge: **disabled**
- Watched: PRs authored by team / label `loop-watch`

## Human Gates

- Security, auth, payments, infrastructure
- PRs with >10 files changed in loop fix

## Pattern

[pr-babysitter.md](../../patterns/pr-babysitter.md)