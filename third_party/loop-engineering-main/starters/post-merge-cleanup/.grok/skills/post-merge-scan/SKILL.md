---
name: post-merge-scan
description: >
  Scan recent merges to main for follow-up cleanup: TODOs, deprecations,
  broken doc links, stale flags. Use in post-merge cleanup loops.
user_invocable: true
---

# Post-Merge Scan Skill

## Output per merge

```markdown
### PR #N — title (merged DATE)
- Follow-ups found: (list with file:line)
- Risk: low | medium | high
- Effort: small | medium | large
- Suggested loop action: minimal-fix | ticket | escalate-human | skip
```

## What to look for

- `TODO` / `FIXME` introduced in merge
- Deprecated APIs still referenced
- Broken internal doc links
- Stale feature flags marked for removal
- Unused imports or dead code clusters (small only)

## Rules

- Only scan merges from the last 7 days unless state says otherwise.
- Large refactors → ticket, not auto-fix.
- Medium+ risk paths → escalate-human.
- Be concise — this runs off-peak, not during active dev hours.