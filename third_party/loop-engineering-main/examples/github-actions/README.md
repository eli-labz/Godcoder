# GitHub Actions Examples

Includes triggers for the new **Changelog Drafter** pattern (daily or on tags). See `changelog-drafter.yml`.

Event-driven and scheduled loops **without** a TUI session. These workflows:

1. Gather context (CI, merges, failures)
2. Update state files
3. **Delegate** to your agent harness in the "Invoke agent" step

## Wiring Your Agent

Replace the placeholder `run:` steps with one of:

| Approach | When |
|----------|------|
| Codex CLI / API | Headless Codex in CI |
| `repository_dispatch` | External runner with Grok/Claude |
| Custom script | Rule-based triage only (L0) |

The state file schema and skills are tool-agnostic — only the invocation step differs.

## Workflows

| File | Trigger | Pattern |
|------|---------|---------|
| [daily-triage.yml](./daily-triage.yml) | Cron weekdays | Daily Triage |
| [ci-sweeper.yml](./ci-sweeper.yml) | `workflow_run` failure | CI Sweeper |
| [post-merge-cleanup.yml](./post-merge-cleanup.yml) | Push to main + nightly | Post-Merge Cleanup |
| [issue-triage.yml](./issue-triage.yml) | Cron 2h weekdays + `issues` events | Issue Triage |

## Security

- Use `GITHUB_TOKEN` with minimum permissions
- No secrets in workflow logs
- See [safety.md](../../docs/safety.md)