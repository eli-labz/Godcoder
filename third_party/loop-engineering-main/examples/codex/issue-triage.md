# Issue Triage — Codex App

Low-risk issue queue health loop. Report-only in week one.

## Automation Setup

In the Codex **Automations** tab:

| Field | Value |
|-------|--------|
| Project | Your repo checkout |
| Cadence | Every 2h (busy repos) or 1d (quiet repos) |
| Environment | Local or background worktree |
| Prompt | See below |

Optional: add `issues` webhook trigger for immediate triage on new issues.

## Prompt (L1 — Propose Only)

```
Run $issue-triage on this project. Read issue-triage-state.md if present.

Update issue-triage-state.md:
- Last run timestamp
- Open actionable count + delta since last run
- Top 5 prioritized issues with one-sentence summaries
- Suggested labels (proposed only — do not apply)
- "needs human" bucket for ambiguous, duplicate, or security-sensitive items

Week 1: report only. Do not modify issues, labels, or source files.
Flag anything touching auth, payments, or public API for human review.
```

## Skills

Install `issue-triage` per [Codex Agent Skills](https://developers.openai.com/codex/skills) — scaffold with `loop-init` or copy `templates/SKILL.md.issue-triage` to `.codex/skills/issue-triage/SKILL.md`.

Define light verifier in `.codex/agents/verifier.toml` before enabling L2.

## State Schema

```markdown
# Issue Triage State
Last run: 2026-06-18 09:00 UTC
Open actionable: 14
New since last run: 3
Needs human: 2

## Top 5
- #487 (p1) — Crash on export — suggested: bug, needs-repro
```

## Triage Inbox

Runs with findings land in Codex Triage inbox — review there plus `issue-triage-state.md`. Empty runs archive automatically.

## Phase 2 — Allowlisted Auto-Labels

Add to prompt after calibration:

```
For allowlisted labels only (area:*, needs-repro): apply after verifier subagent passes.
Never auto-close. Never label P0/P1 without human confirmation.
```

## Pairing with Daily Triage

Run a separate daily automation that reads both `STATE.md` and `issue-triage-state.md`, merging top issues into Daily Triage High Priority.

## References

- [patterns/issue-triage.md](../../patterns/issue-triage.md)
- [codex/daily-triage.md](./daily-triage.md)
- [docs/primitives-matrix.md](../../docs/primitives-matrix.md)