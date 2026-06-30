# Changelog Drafter — Week One (L1 Draft Only)

## Setup
- New pattern + starter added to the reference.
- Running daily via `/loop 1d` (or scheduled Action in future).
- Goal: produce `RELEASE_NOTES_DRAFT.md` from recent merges. Human reviews before any publish.

## What Worked
- `changelog-scan` quickly gave a clean, citable list of PRs + direct commits.
- `draft-release-notes` produced nicely categorized output on first try (Features / Fixes / Breaking surfaced correctly).
- State file (`changelog-drafter-state.md`) made it trivial to know the window and what was already reviewed.

## What Broke / Needed Tuning
- First draft included too many internal chore PRs (Dependabot noise). Fixed by strengthening the "ignore bot + pure deps" rule in the scan skill.
- Tone was a bit dry compared to previous manual notes. Added a short "Release voice" paragraph to AGENTS.md that the drafter now reads.
- One breaking change was buried. The verifier skill caught it and forced it to the top with a callout.

## Metrics (first 5 runs)
- Average items per window: 11
- Human review time per draft: ~4 minutes (down from ~15–20 min when writing from scratch)
- False positives in draft (items that shouldn't be public): 2 in week one → 0 after rule tweak
- Breaking/security items always surfaced correctly after verifier pass

## Lesson
Changelog Drafter is one of the easiest loops to start with after Daily Triage. The leverage is huge (every user sees the output), the risk is very low (read + propose), and it forces good hygiene around conventional commits and labels.

Next step for this reference: wire it to actually propose a CHANGELOG PR on release weeks (with human approval gate) and run it as part of the release process.

See the full pattern in `patterns/changelog-drafter.md` and the starter in `starters/changelog-drafter/`.