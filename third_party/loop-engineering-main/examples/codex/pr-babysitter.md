# PR Babysitter — Codex App

## Automation

| Field | Value |
|-------|--------|
| Cadence | Every 5–15 minutes (working hours) |
| Prompt | `$pr-review-triage` + update state + conditional fix flow |

## Prompt Template

```
For open PRs on this repo (team-authored or label loop-watch):

1. Run $pr-review-triage
2. Update pr-babysitter-state.md
3. If CI red or actionable review comment AND attempts < 3:
   - Open worktree
   - Implementer: $minimal-fix
   - Verifier subagent: must APPROVE
   - Comment on PR with proposal — do not merge
4. If attempts >= 3 or high-risk labels: Triage inbox + escalate
```

## Subagents (`.codex/agents/`)

```toml
# verifier.toml — example structure
name = "verifier"
description = "Rejects loop fixes unless tests pass and scope is minimal"
instructions = "See templates/SKILL.md.verifier"
model = "strongest-available"
reasoning_effort = "high"
```

## Connectors

Use GitHub MCP connector to list PRs, read checks, and post comments.