# Safe Write Pattern (MCP + Loops)

Any time a loop needs to *change* external state (create PR, update ticket, post comment that looks official), follow this pattern:

1. **Discovery / Triage** (read MCP or local git)
2. **Worktree** for code changes (isolated)
3. **Implementer sub-agent** (minimal-fix or equivalent)
4. **Verifier sub-agent** (separate session or higher-reasoning model)
5. **Propose only**:
   - Open a draft PR (or comment with diff link + summary)
   - Or create/update a ticket with "proposed by loop — human review requested"
   - Sign everything: `🤖 Loop Engineering — <Pattern Name>`
6. **Record in state** (what was proposed, link, timestamp, risk)
7. **Human gate** (or very narrow allowlist + extra verifier for trivial patches)
8. **Prune / close** stale proposals on next runs

## Example MCP + Prompt Snippet (Grok)

```
/loop 15m 
Use github-propose MCP (read + draft PR + comment).
Run pr-review-triage on open PRs.
For low-risk, allowlisted items that pass verifier:
  - open worktree
  - minimal-fix
  - loop-verifier
  - post signed comment + link to worktree (or open draft PR)
Never merge. Update pr-babysitter-state.md.
```

## Why This Works

- The loop has **agency** (it can discover and propose quickly).
- The **human (or strict allowlist)** retains final authority on mutation.
- Full context lives in STATE + the PR/ticket, so comprehension debt stays manageable.
- Easy to pause: `scheduler_delete` or disable the Action.

This is the recommended default for all L2+ loops that touch external systems.
