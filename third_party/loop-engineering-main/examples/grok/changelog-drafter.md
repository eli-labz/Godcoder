# Grok — Changelog Drafter Example

## Invocation (report + draft, L1)

```bash
/loop 1d Run changelog-scan on merges to main since last tag (or last state date). Produce a clean categorized draft using draft-release-notes. Write the draft to RELEASE_NOTES_DRAFT.md at repo root. Update changelog-drafter-state.md with the window and draft status. Do not publish or create any PRs/tags — human review only this week.
```

## What the loop should maintain
- `changelog-drafter-state.md` (or copy the example from the starter)
- `RELEASE_NOTES_DRAFT.md` (overwritten or versioned each run)
- Links in state back to the source PRs/commits

## Week 1 Goals
- Get the scan + draft reliable.
- Human reads every draft and gives feedback on voice / missed items.
- Tune the scan skill to ignore noise (bots, pure deps, internal-only changes).

After week 1 you can move to L2: the loop can propose a small PR that adds the approved draft to CHANGELOG.md (still with human approval to merge).

See the full pattern: [patterns/changelog-drafter.md](../../patterns/changelog-drafter.md) and starter.
