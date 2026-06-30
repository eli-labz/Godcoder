# Sample Loop Run Log (Populated)

This is an example of a real (lightly anonymized) run log following `templates/loop-run-log.md.template`.

Append one structured entry per significant run (or daily summary). Prune old entries.

## Recent Runs

```json
{
  "run_id": "2026-06-09T08:17:00Z",
  "pattern": "daily-triage",
  "duration_s": 38,
  "items_found": 5,
  "actions_taken": 0,
  "escalations": 1,
  "tokens_estimate": 48000,
  "outcome": "report-only",
  "notes": "Two CI flakes on main (known), one new PR needing review. Escalated design decision on auth refactor to human."
}
```

```json
{
  "run_id": "2026-06-08T18:45:00Z",
  "pattern": "changelog-drafter",
  "duration_s": 62,
  "items_found": 14,
  "actions_taken": 1,
  "escalations": 0,
  "tokens_estimate": 31000,
  "outcome": "draft-proposed",
  "notes": "Draft written to RELEASE_NOTES_DRAFT.md. 1 breaking change + 2 security notes surfaced and verified. Human review scheduled for tomorrow."
}
```

```json
{
  "run_id": "2026-06-07T09:05:00Z",
  "pattern": "post-merge-cleanup",
  "duration_s": 29,
  "items_found": 3,
  "actions_taken": 2,
  "escalations": 0,
  "tokens_estimate": 19000,
  "outcome": "fix-proposed",
  "notes": "Small doc link fix + one stale flag removal in low-risk area. Both passed verifier in worktree. PRs opened (off-peak)."
}
```

## How to Use
- The loop (or a wrapper script / GitHub Action step) appends a compact JSON block after every run.
- Humans can `grep` or view the file to get a fast picture without reading full chat histories.
- Feed the recent entries back into the next loop run as context (via STATE.md or directly).
- Combine with `loop-budget.md` to detect when you're burning too many tokens or spawning too many sub-agents.

See `templates/loop-run-log.md.template` and `templates/loop-budget.md.template` for the canonical empty versions.