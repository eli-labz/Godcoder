# Issue Triage — Claude Code

Same pattern as Grok; uses `$issue-triage` skill invocation and Claude Code scheduling.

## Report-Only (Week 1)

```bash
/loop 2h $issue-triage — read issue-triage-state.md first. Scan open issues since last run. Update state with Top 5, suggested labels, and needs-human bucket. Propose only — do not apply labels or close issues. Escalate auth, payments, and security items.
```

## Skills Setup

Scaffold or copy the skill:

```bash
npx @cobusgreyling/loop-init . --pattern issue-triage --tool claude
# Or manually:
mkdir -p .claude/skills/issue-triage
cp templates/SKILL.md.issue-triage .claude/skills/issue-triage/SKILL.md
```

Add verifier for L2 graduation:

```bash
cp templates/SKILL.md.verifier .claude/agents/loop-verifier.md
```

## State File

`issue-triage-state.md` at repo root — same schema as [patterns/issue-triage.md](../../patterns/issue-triage.md).

Scaffold:

```bash
npx @cobusgreyling/loop-init . --pattern issue-triage --tool claude --dry-run
```

## Allowlisted Labels (L2 only, week 3+)

After 10 stable L1 runs, enable auto-apply for:

- `area:*` (component labels)
- `needs-repro`, `needs-info`
- `duplicate?` (comment only, never auto-close)

Human gate remains on: `P0`, `P1`, `security`, `breaking-change`.

## Pairing with Daily Triage

```bash
/loop 1d $loop-triage — read STATE.md and issue-triage-state.md. Merge top issue-triage items into High Priority. Report only week one.
```

## GitHub Action Fallback

For event-driven triage on new issues, see [examples/github-actions/issue-triage.yml](../github-actions/issue-triage.yml).

## References

- [patterns/issue-triage.md](../../patterns/issue-triage.md)
- [docs/primitives-matrix.md](../../docs/primitives-matrix.md)