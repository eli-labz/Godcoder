---
name: changelog-scan
description: >
  Scan recent merges to main (and noteworthy direct commits) since a given window
  (last tag or date in state). Extract titles, labels, types, linked issues, and
  signals for breaking changes or security. Produces structured input for a
  release notes drafter. Use in changelog-drafter loops.
user_invocable: true
---

# Changelog Scan Skill

## Inputs the loop will provide
- Last release tag or previous run timestamp (from state or git)
- Current date / "now"
- Any explicit "since" override

## Output Format (one block per significant item)

```markdown
### PR #1234 — feat(auth): add magic link login (merged 2026-06-08)
- Type: feature
- Labels: enhancement
- Breaking: no
- Security: no
- Linked: #1220
- Summary (one sentence from PR or commit): Users can now log in via emailed magic links.
- Files touched (high level): auth/, emails/
```

Rules for what to include:
- All merged PRs to main in the window.
- Direct commits on main that look user-facing (conventional commit feat/fix/perf/security or have linked issues).
- Ignore pure dependency bumps, internal chores, and bot PRs unless they are security-related (those are handled by dependency-sweeper).

## Additional Signals to Surface
- Any PR or commit message containing "BREAKING", "breaking change", or `!` conventional commit.
- Security-related keywords or labels (CVE, vuln, security).
- Items with "deprecate" or "remove" language.

## Output Summary Section (always at end)

```markdown
## Scan Summary
- Total items: N
- Features: N
- Fixes: N
- Breaking: N (list them)
- Security: N (list them)
- Recommended next action for loop: draft-release-notes | human review needed first | too many items — split window
```

Be precise and cite sources (PR numbers / shas). Do not invent details.