---
name: pr-review-triage
description: >
  Triage open pull requests for CI status, review comments, and merge readiness.
  Use in PR babysitter loops. Respects project review norms and required checks.
user_invocable: true
---

# PR Review Triage Skill

For each watched PR, report:

## Per-PR Output

```markdown
### PR #N — title
- CI: green | red (job names if red)
- Reviews: approved N | changes requested | none
- Blocking comments: (list actionable ones)
- Ready to merge: yes | no — reason
- Suggested loop action: none | minimal-fix | rebase | escalate-human
```

## Rules

- "Ready to merge" requires all required checks + approvals per project policy.
- Non-actionable nits → note but do not spawn fix.
- If PR idle >4 days → suggest human handoff.
- High-risk labels (security, breaking) → escalate-human always.