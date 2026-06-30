# Minimal Loop Starter — Claude Code

Clone this into your project root to run a **report-only daily triage loop** (L1 readiness).

## Quick Start

1. Copy files into your repo:

   ```bash
   cp -r starters/minimal-loop-claude/.claude/skills/loop-triage .claude/skills/
   cp starters/minimal-loop-claude/.claude/agents/loop-verifier.md .claude/agents/
   cp starters/minimal-loop-claude/STATE.md.example STATE.md
   cp starters/minimal-loop-claude/LOOP.md .
   ```

2. Customize `STATE.md` project name.

3. Start the loop (Claude Code):

   ```bash
   /loop 1d Run $loop-triage. Read STATE.md first. Append high-priority and watch items. Update Last run timestamp. Do not auto-fix anything in week one.
   ```

4. Read `STATE.md` each morning for 1–2 weeks. Tune the triage skill.

5. When triage quality is good, add `minimal-fix` from `templates/SKILL.md.minimal-fix` and enable small auto-wins with the verifier agent (`isolation: worktree` on implementer tasks).

## What's Included

| File | Purpose |
|------|---------|
| `STATE.md.example` | State spine template |
| `.claude/skills/loop-triage/SKILL.md` | Triage skill |
| `.claude/agents/loop-verifier.md` | Checker sub-agent for L2+ |
| `LOOP.md` | Loop config doc for your team |

## Next Steps

- [Loop Design Checklist](../../docs/loop-design-checklist.md)
- [Daily Triage pattern](../../patterns/daily-triage.md)
- [Claude Code example](../../examples/claude-code/daily-triage.md)
- Run `npx @cobusgreyling/loop-audit .` for readiness score