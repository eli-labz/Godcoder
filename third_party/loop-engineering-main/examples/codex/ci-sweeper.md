# Codex — CI Sweeper Example

Schedule a **15m** automation:

1. Run `ci-triage` skill on failing checks
2. Update `ci-sweeper-state.md`
3. Attempt minimal fixes in isolated checkout with verifier sub-agent
4. Stop after 3 failures on the same root cause

See [starters/ci-sweeper/.codex](../../starters/ci-sweeper/.codex/).