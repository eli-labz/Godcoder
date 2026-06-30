# Codex — Changelog Drafter Example

Daily automation:

1. `changelog-scan` since last tag or state date
2. `draft-release-notes` → `RELEASE_NOTES_DRAFT.md`
3. Update `changelog-drafter-state.md`
4. Human review before merge to `CHANGELOG.md`

See [examples/grok/changelog-drafter.md](../grok/changelog-drafter.md) for the Grok invocation variant.