# Post-Merge Cleanup — small wins without the babysitter tax

**Pattern:** [post-merge-cleanup](../patterns/post-merge-cleanup.md)  
**Cadence:** 1d (off-peak)  
**Tool:** Grok Build TUI + GitHub Actions fallback  
**Level:** L1 → cautious L2 (docs/comments only)  
**Outcome:** Useful, low-noise follow-up PRs — not a magic janitor

## Setup

A mid-size SaaS team (12 engineers, ~40 merges/week) ran post-merge cleanup after shipping a feature branch. Predictable leftovers piled up: stale comments, half-updated docs, and tiny lint issues nobody wanted to context-switch for. PR Babysitter felt too heavy for work already on `main`.

- **Loop:** daily post-merge scan on merges in the last 24–48h
- **Skills:** `post-merge-scan`, `minimal-fix`, `loop-verifier`
- **State:** `post-merge-state.md` with fixed / ticketed / ignored per merge SHA
- **Week one:** L1 report only — loop listed candidates, humans picked two
- **Denylist:** `auth/`, `payments/`, anything touching public API contracts

## What Worked

- Off-peak cadence (21:00 local) avoided fighting active feature work
- State file prevented re-scanning the same merge three days in a row
- Verifier caught a “doc fix” that secretly changed a public API example
- Two engineers got value from the **report alone** without enabling L2 auto-fix
- First L2 PR (stale TODO comment removal) merged in 6 minutes with human LGTM

## What Broke

**Surprise — the doc fix that wasn't:** On day 4 the loop proposed a one-line README correction for a merge from PR #892. The verifier flagged it: the example response body had changed from `{ "id": string }` to `{ "userId": number }`, matching an undocumented API drift. The implementer had classified it as “docs only.” Without the verifier split, this would have shipped as a innocent documentation tweak.

**Bot-merge noise:** The loop over-triaged Dependabot and Renovate merge commits for three days straight, generating 11 “candidates” that were lockfile-only. Engineers started ignoring the report. Fix: added `ignored_authors` (dependabot, renovate) and `min_diff_lines: 3` to state.

**False confidence on feature flags:** The loop suggested removing `legacyAuth` based on a `// remove after Q2` comment, but the flag was still referenced in a mobile client the loop couldn't see (separate repo). A human caught it; we added “cross-repo flags → always escalate” to `LOOP.md`.

## Metrics (4-week pilot)

| Metric | Before | After L1+L2 (docs only) |
|--------|--------|-------------------------|
| Median time merge → first follow-up | 6.2 days | 1.4 days |
| Follow-up PRs opened per week | 0–1 (ad hoc) | 3–5 (loop-proposed, human-approved) |
| False-positive rate (human judged) | — | ~18% week 1 → ~6% week 4 |
| Engineer “report useful?” (1–5) | — | 4.1 average by week 3 |

## Lesson

Start L1 for two weeks — the report calibrates what your team actually considers debt. Enable L2 only for docs, comments, and lint paths with a verifier that treats API examples as code. Keep architectural debt in Linear, not in the loop. Post-Merge Cleanup is a complement to PR Babysitter, not a replacement: it runs off-peak on work already landed.