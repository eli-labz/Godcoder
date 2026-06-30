# Issue Triage Starter

Scaffold for the [Issue Triage](../../patterns/issue-triage.md) loop — L1 propose-only week one. Pairs with Daily Triage as a low-risk issue queue feeder.

## Quick Start

```bash
# Grok
npx @cobusgreyling/loop-init . --pattern issue-triage --tool grok

# Claude Code
npx @cobusgreyling/loop-init . --pattern issue-triage --tool claude

# Codex
npx @cobusgreyling/loop-init . --pattern issue-triage --tool codex
```

Start (Grok, week one):

```
/loop 2h Run issue-triage. Read issue-triage-state.md first. Update Top 5 and proposed labels. No auto-apply. Escalate security and ambiguous items.
```

## Files

| File | Purpose |
|------|---------|
| `issue-triage-state.md.example` | Rolling backlog health |
| `.grok/skills/issue-triage/` | Issue scan + prioritize skill |
| `.claude/agents/loop-verifier.md` | L2 label-apply checker |
| `LOOP.md` | Cadence and human gates |

## Safety

- No auto-label or close in L1
- Denylist: auth, payments, security — see [safety.md](../../docs/safety.md)