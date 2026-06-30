# goal-audit

Goal Readiness Score CLI for Grok Build `/goal` workflows.

## Install / run

```bash
npx @cobusgreyling/goal-audit .
npx @cobusgreyling/goal-audit . --suggest
npx @cobusgreyling/goal-audit . --json
```

## Levels

| Level | Score | Meaning |
|-------|-------|---------|
| G0 | < 40 | Ad hoc `/goal` usage |
| G1 | 40–59 | GOAL.md + assisted goals |
| G2 | 60–79 | Verifier + test gates |
| G3 | 80+ | CI, budget, run log |

## Development

```bash
npm install
npm test
```