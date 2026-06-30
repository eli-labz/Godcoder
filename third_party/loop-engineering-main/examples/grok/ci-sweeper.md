# Grok — CI Sweeper Example

```bash
/loop 15m Run ci-triage on failing CI for default branch and open PRs. Update ci-sweeper-state.md. Fix only clear regressions in an isolated worktree. Spawn loop-verifier before any push. Max 3 attempts per failure cluster.
```

Week one: classify-only — no fixes until triage accuracy is trusted. See [patterns/ci-sweeper.md](../../patterns/ci-sweeper.md).