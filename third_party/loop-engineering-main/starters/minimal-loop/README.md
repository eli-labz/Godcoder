# Minimal Loop Starter

Clone this into your project root to run a **report-only daily triage loop** (L1 readiness).

## Quick Start

1. Copy files into your repo:
   ```bash
   cp -r starters/minimal-loop/.grok/skills/loop-triage .grok/skills/  # Grok
   cp starters/minimal-loop/STATE.md.example STATE.md
   ```

2. Customize `STATE.md` project name.

3. Start the loop (Grok):
   ```bash
   /loop 1d Run the loop-triage skill. Read STATE.md first. Append high-priority and watch items. Update Last run timestamp. Do not auto-fix anything in week one.
   ```

4. Read `STATE.md` each morning for 1–2 weeks. Tune the triage skill.

5. When triage quality is good, add `minimal-fix` + `loop-verifier` from `templates/` and enable small auto-wins.

## What's Included

| File | Purpose |
|------|---------|
| `STATE.md.example` | State spine template |
| `.grok/skills/loop-triage/SKILL.md` | Triage skill |
| `LOOP.md` | Loop config doc for your team |

## Other tools

- Claude Code: [minimal-loop-claude](../minimal-loop-claude/)
- Codex: [minimal-loop-codex](../minimal-loop-codex/)

## Next Steps

- [Loop Design Checklist](../../docs/loop-design-checklist.md)
- [Daily Triage pattern](../../patterns/daily-triage.md)
- Run `npx @cobusgreyling/loop-audit .` for readiness score