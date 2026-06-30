# Daily Triage — OpenClaw

Same pattern as Grok and Claude Code; scheduling runs on the **Gateway** (`openclaw cron`) instead of a TUI `/loop`. Optional **channel delivery** (Slack, Telegram, etc.) is the main reason to run triage here.

## Prerequisites

1. [OpenClaw Gateway](https://docs.openclaw.ai/) running with your repo as the agent workspace.
2. `STATE.md` at the repo root — copy from `starters/minimal-loop/STATE.md.example`.
3. `loop-triage` skill — copy `templates/SKILL.md.loop-triage` to `<workspace>/skills/loop-triage/SKILL.md` (or `openclaw skills install` from ClawHub once published).

```bash
mkdir -p skills/loop-triage
cp templates/SKILL.md.loop-triage skills/loop-triage/SKILL.md
cp starters/minimal-loop/STATE.md.example STATE.md
```

## Report-Only (Week 1)

Isolated cron job: fresh session each run, writes to `STATE.md`, no code edits.

```bash
openclaw cron create "0 7 * * 1-5" \
  --name "Daily triage" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Run the loop-triage skill. Read STATE.md. Merge findings into High Priority and Watch List. Update Last run timestamp. Do not edit source code. End with a 5-line summary." \
  --tools read,write,exec \
  --announce \
  --channel slack \
  --to "channel:C1234567890"
```

Omit `--announce`, `--channel`, and `--to` to keep output in the Gateway only (repo + session).

Faster cadence during active periods:

```bash
openclaw cron create "0 */2 * * *" \
  --name "Triage pulse" \
  --session isolated \
  --message "Run loop-triage. Report obvious small wins only. Update STATE.md. No code changes."
```

## With Small Auto-Fixes (Week 3+)

Add a verifier agent (separate `agents.list` entry) or explicit checker instructions in the cron message. Restrict tools until the loop is trusted.

```bash
openclaw cron edit <job-id> \
  --message "Run loop-triage. For high-priority single-file bugfixes: create an isolated git worktree, implement minimal fix, run tests, have a verifier pass review the diff. Update STATE.md. Escalate ambiguous or denylisted paths."
```

Enable the bundled `coding-agent` skill only when delegating to an external CLI (`claude`, `codex`, etc.) is intentional — see [OpenClaw skills config](https://docs.openclaw.ai/tools/skills-config).

## Event-Triggered Triage

Webhook instead of cron — useful after deploys or CI failures:

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'Authorization: Bearer <hooks-token>' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Run loop-triage on recent CI failures. Update STATE.md. Report only.","name":"CI triage","deliver":false}'
```

Keep hook endpoints on loopback or a trusted tailnet. See [Scheduled tasks](https://docs.openclaw.ai/automation/cron-jobs) and [Security](https://docs.openclaw.ai/gateway/security).

## Verification Split

| Role | OpenClaw shape |
|------|----------------|
| Triage | `loop-triage` skill + isolated cron |
| Implementer | Main agent or `coding-agent` in worktree via `exec` |
| Verifier | Second agent id in `agents.list`, or checker block in cron `--message` |

Isolated cron runs prefer **final descendant output** over interim status text — structure verifier work as explicit sub-steps in the message.

## Safety (L1 defaults)

- `--session isolated` — do not pollute human chat history with routine triage turns.
- Restrict `--tools` on cron jobs until L2 graduation.
- Channel `allowFrom` / mention rules before enabling `--announce` to DMs or groups.
- Week one: **report-only**; human reads `STATE.md` and the channel summary.

## Operations

```bash
openclaw cron list
openclaw cron runs --id <job-id>
openclaw cron edit <job-id> --message "..."
```

Pause: remove or disable the job (`openclaw cron remove <job-id>`) or set `loop-pause-all` in `STATE.md` and teach the skill to stop acting.

Audit readiness: `npx @cobusgreyling/loop-audit . --suggest`

## References

- Peter Steinberger — design loops, not one-off prompts ([sources](../../resources/sources.md))
- [primitives-matrix.md](../../docs/primitives-matrix.md) — OpenClaw column
- [patterns/daily-triage.md](../../patterns/daily-triage.md)
- [docs/safety.md](../../docs/safety.md)