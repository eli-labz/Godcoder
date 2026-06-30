# Loop Configuration — Changelog Drafter

## Active Loops

| Pattern | Cadence | Status | Command / Trigger |
|---------|---------|--------|-------------------|
| Changelog Drafter | 1d or on release prep | L1 (report + draft) first 1–2 weeks | See README |

## Human Gates (this project)

- Breaking changes → always human review + explicit callout in notes
- Security notes / CVEs → human must approve wording
- Major features or marketing-sensitive items → human curates placement / tone
- First 3 releases with this loop: human must approve the full draft before any automated PR or publish

## Budget & Cadence

- Max sub-agent spawns per run: 2 (one scanner + one drafter, or drafter + verifier)
- Prefer running after merges settle (evening or scheduled Action)
- On release week: switch to manual trigger or tighter window

## Output Convention

- Draft written to `RELEASE_NOTES_DRAFT.md` (or a section in a release tracking issue)
- Final approved notes incorporated into `CHANGELOG.md` (or GitHub Release body) by human or allowlisted automation
- State file updated on every run

## Links

- Pattern: [changelog-drafter](../../patterns/changelog-drafter.md)
- Starter: this directory
- Audit this starter: `npx @cobusgreyling/loop-audit . --suggest`