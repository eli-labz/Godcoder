# PR Babysitter — Claude Code

## Command

```bash
/loop 5m /babysit
```

Or explicit (matches this repo's pattern):

```bash
/loop 5m For each open PR I care about: triage CI and reviews. Propose minimal fixes in worktree. Verifier agent must approve before commenting. Update pr-babysitter-state.md. Max 3 attempts per PR.
```

## With /goal on a Single PR

```bash
/goal PR #1234 has green CI, no blocking review comments, and is rebased on main
```

## State

Use `pr-babysitter-state.md` from `starters/pr-babysitter/`.

## Notes

- Combine with hooks for pre-commit checks if the loop edits locally
- GitHub Actions can complement `/loop` when laptop is closed