# Issue Triage Loop (Grok Example)

Low-risk companion to [Daily Triage](./daily-triage.md). Keeps the issue queue legible so morning triage and humans always know the top five.

## Week 1 — Propose Only (L1)

```bash
/loop 2h Run the issue-triage skill. Read issue-triage-state.md first. Scan open issues and discussions since last run. Update issue-triage-state.md with:
- Top 5 prioritized items (P0–P3) with one-sentence summaries
- Suggested labels (proposed only — do not apply)
- "needs human" bucket for ambiguous or security-sensitive items
Do not auto-label, close, or comment on issues. Escalate duplicates as "possible duplicate of #NNN" for human confirmation.
```

Faster cadence for busy repos:

```bash
/loop 1d Run issue-triage at start and end of day. Report mode only.
```

## Supporting Files

| File | Purpose |
|------|---------|
| `issue-triage-state.md` | Rolling backlog health (see [patterns/issue-triage.md](../../patterns/issue-triage.md)) |
| `issue-triage` skill | Bundled in [starters/issue-triage](../../starters/issue-triage/) or copy `templates/SKILL.md.issue-triage` |
| `loop-verifier` skill | Light sanity check on proposed labels before L2 |
| `STATE.md` | Daily Triage reads this; Issue Triage feeds it via cross-reference |

Scaffold state file:

```bash
npx @cobusgreyling/loop-init . --pattern issue-triage --tool grok --dry-run
```

## Typical `issue-triage-state.md` Shape

```markdown
# Issue Triage State
Last run: 2026-06-18 09:00 UTC
Open actionable: 14 (was 17)
New since last run: 3
Needs human: 2

## Top 5 (by loop score)
- #487 (bug, p1, 2d old) — "Crash on export with large files" — suggested: bug, needs-repro, area:export
- #491 (feature, p2) — "Dark mode for settings" — suggested: enhancement, area:ui
- #488 (duplicate?) — possible duplicate of #412 — human confirm

## Proposed Labels (not applied — L1)
- #487: `bug`, `needs-repro`, `area:export`
- #491: `enhancement`, `area:ui`
```

## MCP (Optional)

Enable GitHub MCP read-only for issue discovery and linked-PR signals. Scope to read + propose until the loop is trusted.

## Pairing with Daily Triage

Issue Triage runs more frequently (2h–1d) and produces a clean queue. Daily Triage (1d) reads `issue-triage-state.md` and merges the top items into `STATE.md` High Priority.

## Evolution Path

1. **L1 (weeks 1–2):** Propose labels and priority only; human applies manually.
2. **L2 (week 3+):** Auto-apply allowlisted labels (`area:*`, `needs-repro`) after verifier passes.
3. **Never unattended:** P0/P1 on auth, payments, security, or public API — human only.

## References

- [patterns/issue-triage.md](../../patterns/issue-triage.md)
- [docs/primitives-matrix.md](../../docs/primitives-matrix.md)
- [stories/daily-triage-report-only.md](../../stories/daily-triage-report-only.md)