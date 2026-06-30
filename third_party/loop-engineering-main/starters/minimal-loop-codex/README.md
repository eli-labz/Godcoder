# Minimal Loop Starter — Codex

Clone this into your project root to run a **report-only daily triage loop** (L1 readiness).

## Quick Start

1. Copy files into your repo:

   ```bash
   cp -r starters/minimal-loop-codex/.codex/skills/loop-triage .codex/skills/
   cp starters/minimal-loop-codex/.codex/agents/verifier.toml .codex/agents/
   cp starters/minimal-loop-codex/STATE.md.example STATE.md
   cp starters/minimal-loop-codex/LOOP.md .
   ```

2. Customize `STATE.md` project name.

3. Create an **Automation** in the Codex app (Automations tab):

   | Field | Value |
   |-------|--------|
   | Cadence | Daily (e.g. `1d`) |
   | Environment | Local checkout or background worktree |
   | Prompt | See below |

   ```
   Run $loop-triage. Read STATE.md first. Append high-priority and watch items.
   Update Last run timestamp. Week 1: report only — do not modify source files.
   ```

4. Review findings in the Codex Triage inbox + `STATE.md` for 1–2 weeks.

5. When triage quality is good, add `minimal-fix` from `templates/` and enable small auto-wins with the verifier subagent in an isolated worktree.

## What's Included

| File | Purpose |
|------|---------|
| `STATE.md.example` | State spine template |
| `.codex/skills/loop-triage/SKILL.md` | Triage skill |
| `.codex/agents/verifier.toml` | Checker sub-agent for L2+ |
| `LOOP.md` | Loop config doc for your team |

## Next Steps

- [Loop Design Checklist](../../docs/loop-design-checklist.md)
- [Daily Triage pattern](../../patterns/daily-triage.md)
- [Codex example](../../examples/codex/daily-triage.md)
- Run `npx @cobusgreyling/loop-audit .` for readiness score