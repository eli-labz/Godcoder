# CI Sweeper Loop

**Goal**: React quickly to failing CI on main or active branches — diagnose, propose minimal fixes, and escalate when the loop cannot confidently resolve.

## Scheduling

**Recommended**:
- `/loop 15m` during active development (Grok, Claude Code)
- `/loop 5m` when main is red and you're shipping
- GitHub Action on `workflow_run` failure (event-driven, not polling)

Slower overnight cadence (30–60m) is fine when no one is watching.

## Required Skills

- `ci-triage` — Parse CI logs, identify failing job/step, classify failure type (flake, regression, env, config)
- `minimal-fix` — Smallest change that addresses the specific failure
- Project test/lint skill — Build and test commands for your stack

## State

`ci-sweeper-state.md` or section in `STATE.md`:

```markdown
## CI Sweeper — Active Failures

Last run: 2026-06-09 14:30 UTC

### main @ abc1234
- Job: test-auth
- Failure: AssertionError in test_refresh_token_expiry
- Attempts: 1/3
- Last action: Minimal fix proposed in worktree fix/ci-auth-refresh
- Status: Waiting for verifier + human

### Resolved (last 7d)
- main @ def5678 — lint fix merged via PR #1250
```

Track: commit SHA, failing job, attempt count, worktree/PR link, outcome.

## How the Loop Runs (Typical Cycle)

1. Discover CI failures on watched branches (main, release/*, active PRs).
2. For each new failure:
   - Classify: flake vs real regression vs infra.
   - If flake (seen before, intermittent): add to Watch, do not auto-fix.
   - If actionable: open worktree → implementer drafts fix.
3. Verifier sub-agent checks: fix addresses failure, no unrelated changes, tests pass locally.
4. Open PR or comment on existing PR with proposed fix.
5. If attempts exceed max (e.g. 3): escalate to human with full context.
6. Prune resolved failures from active list.

## Verification Strategy

- Verifier must run tests in the worktree before approving.
- Implementer cannot merge — only propose.
- Flake detection: if same test failed and passed on retry without code change, do not auto-fix.

## Human Handoff Points

- Infrastructure failures (runner OOM, registry down, secrets missing)
- Failures touching >5 files or core architecture
- Security-sensitive test failures
- Max attempts exceeded on same failure
- Intermittent flakes that need quarantine, not code changes

## Tool-Specific Notes

**Grok Build TUI**:
```bash
/loop 15m Check CI on main and open PRs. For new failures: classify, and if actionable draft minimal fix in worktree with verifier. Update ci-sweeper-state.md. Escalate after 3 attempts.
```

**Claude Code**:
```bash
/goal All tests on main pass and lint is clean
```
Use `/goal` for focused "get green" sessions; use scheduled sweeper for ongoing monitoring.

**Codex**:
- Automation: "Summarise CI failures every 30m" → Triage inbox; separate automation for fix attempts.

**GitHub Actions**:
- See `examples/github-actions/ci-sweeper.yml` — triggers on workflow failure.

## Failure Modes & Mitigations

| Failure | Mitigation |
|---------|------------|
| Fix-the-symptom loops | Verifier checks root cause, not just green CI |
| Fighting flakes with retries | Classify flakes; quarantine or skip with ticket |
| Token burn on red main | Pause loop after N failures; batch fixes |
| Wrong branch targeted | Explicit branch allowlist in skill |

## Cost Profile

| Scenario | Tokens/run | Notes |
|----------|------------|-------|
| No-op (CI green) | ~5k | **Required** — do not run full sweeper when green |
| Triage / classify | ~50k | Log parse + failure classification |
| Fix attempt (L2) | ~200k | Worktree + implementer + verifier |

**Cadence**: 5m–15m · **Tier**: very-high · **Suggested daily cap**: 1M tokens · **Early exit required**

```bash
npx @cobusgreyling/loop-cost --pattern ci-sweeper --cadence 15m --level L2
```

At 15m cadence without early-exit, worst-case spend exceeds 5M tokens/day. Never run full action paths on every tick.

## Success Metrics

- Mean time to first proposed fix after CI goes red
- % of failures resolved without human intervention (trivial cases only)
- Repeat failure rate (same job failing again within 48h)

Best entry loop for teams new to loop engineering — high frequency, bounded scope, clear verification.