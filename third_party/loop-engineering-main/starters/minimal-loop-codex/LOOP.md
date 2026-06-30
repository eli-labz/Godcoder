# Loop Configuration — Minimal Triage (Codex)

## Active Loops

| Pattern | Cadence | Status | Automation prompt |
|---------|---------|--------|-------------------|
| Daily Triage | 1d | L1 report-only | `Run $loop-triage. Read STATE.md. Report only.` |

## Human Gates

- No auto-fix until L2 checklist complete
- All high-risk paths: human review required (see docs/safety.md denylist)

## Worktrees

- Codex provides a built-in worktree per thread — use it for L2+ fix attempts.
- One fix per worktree; verifier subagent must APPROVE before proposing a PR.

## Connectors (MCP)

- MCP optional for L1 report-only loops.
- For L2+: GitHub connector to read CI/issues; write scope limited to comments until trusted.

## Budget

- Max sub-agent spawns per run: 0 (L1)
- Review STATE.md daily + Codex Triage inbox

## Links

- Pattern: [daily-triage](../../patterns/daily-triage.md)
- Checklist: [loop-design-checklist](../../docs/loop-design-checklist.md)