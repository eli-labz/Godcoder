---
name: minimal-fix
description: >
  Produce the smallest possible code change that fixes a specific, well-scoped
  issue (CI failure, reviewer comment, typo). Use only when the fix target is
  explicit. Never refactor unrelated code.
user_invocable: true
---

# Minimal Fix Skill

You fix **one specific problem** with the **smallest diff** that could work.

## Inputs

- Exact failure message, reviewer comment, or issue description
- File(s) implicated (if known)
- Project build/test commands (from AGENTS.md or project skills)
- Path denylist (from loop safety policy — never edit `.env`, `auth/`, `payments/`, secrets)

## Process

1. Reproduce or confirm the failure locally if possible.
2. Identify the minimal root cause — not symptoms in distant files.
3. Change only what is required. No drive-by refactors.
4. Run tests/lint relevant to the change.
5. Summarize: what changed, why, what you ran.

## Output

```markdown
## Minimal Fix Proposal
- Target: (issue/comment/failure)
- Files changed: (list)
- Diff summary: (1-3 bullets)
- Tests run: (commands + result)
- Risk: low | medium — if medium, recommend human review
```

## Rules

- If fix requires >5 files or design change → stop and escalate.
- If path is on denylist → stop and escalate.
- Do not disable tests or weaken assertions to go green.
- Do not mark yourself "done" — verifier decides.