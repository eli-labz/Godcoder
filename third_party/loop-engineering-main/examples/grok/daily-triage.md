# Daily Triage Loop (Grok Example)

This is a practical, copy-pasteable example of a morning triage loop using the Grok Build TUI.

## The Command

```bash
/loop 1d Run the loop-triage skill on the current project. Append high-priority items to STATE.md. For any small, self-contained bugfix or CI failure, open an isolated worktree, draft a minimal fix using the minimal-fix skill, and have a reviewer sub-agent verify it against project skills and tests. Update the PR or ticket via connectors if possible. Anything ambiguous or high-risk should be clearly flagged for human review in STATE.md.
```

You can also run it on a faster cadence during active periods:
```bash
/loop 2h Run triage and act on obvious small wins only.
```

## Supporting Files You Should Have

- `STATE.md` in the repo root (committed or in a shared location)
- The `loop-triage` skill installed (copy from `templates/SKILL.md.loop-triage`)
- A `minimal-fix` skill (or equivalent instructions)
- Reviewer persona / sub-agent definition
- MCP connectors configured for your issue tracker and/or GitHub (optional but powerful)

## Typical STATE.md Shape

```markdown
# Loop State — Project X

Last run: 2026-06-09 08:15 UTC

## High Priority (loop is acting or waiting on human)
- [ ] #1241 — flaky test in auth flow (CI red on main)
  Loop action: Opened worktree `fix/flaky-auth-test-1241`. Minimal fix proposed. Reviewer sub-agent approved. Waiting for human to review PR.
- [ ] Linear ticket ENG-987 — "Add rate limiting to new endpoint"
  Loop action: None yet (needs design discussion). Flagged for human.

## Watch List
- PR #1238 has been open 4 days with no activity.

## Recent Noise (ignored this run)
- Dependabot PRs (handled by separate automation)
- 3 low-severity lint warnings on experimental branch
```

## Tips for This Loop in Grok

- Use `isolation: "worktree"` on any sub-agent that will edit code.
- Make the reviewer sub-agent use a stronger model or higher reasoning effort.
- After the loop runs, read `STATE.md` yourself the first few times so you can refine the triage skill and the hand-off criteria.
- Add a `durable: true` scheduler entry if you want the loop to survive session restarts (advanced).

## Evolution Path

1. Start with pure reporting (just append to STATE.md).
2. Add "act on obvious small wins".
3. Add connectors that actually open PRs and comment on tickets.
4. Add self-cleanup logic (the loop deletes its own scheduler entry when there is nothing left to watch).

This pattern is deliberately boring. Boring loops that run reliably are the ones that actually save time.
