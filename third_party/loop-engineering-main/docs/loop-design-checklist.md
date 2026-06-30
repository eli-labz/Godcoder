# Loop Design Checklist

Use this before enabling a loop in production. Score honestly — a loop missing verification is not ready for unattended runs.

## 1. Purpose & Scope

- [ ] **Single clear goal** — one sentence: what does this loop accomplish?
- [ ] **Explicit non-goals** — what will this loop *not* do?
- [ ] **Watched scope** — which repos, branches, PRs, or tickets?
- [ ] **Phased rollout** — report-only first, then act on small wins?

## 2. Scheduling

- [ ] **Cadence chosen** — interval matches urgency (see pattern docs)
- [ ] **Fire immediately** — first run on start, or wait for interval?
- [ ] **Durable** — survives session/tool restart if needed?
- [ ] **Off-hours behavior** — slower cadence or paused overnight?
- [ ] **Self-cleanup** — `scheduler_delete` when watchlist empty?

## 3. Skills

- [ ] **Triage skill** exists with tight output format
- [ ] **Action skills** (minimal-fix, etc.) match project conventions
- [ ] **Skill descriptions** are boring and specific (good auto-triggering)
- [ ] **Build/test commands** documented in skills or AGENTS.md

## 4. Maker / Checker Split

- [ ] **Implementer** and **verifier** are separate (agent, model, or instructions)
- [ ] Implementer **cannot** mark its own work "done"
- [ ] Verifier runs **tests** in isolation (worktree) before approving
- [ ] `/goal` or equivalent uses a **fresh model** for stop condition (if applicable)

## 5. State / Memory

- [ ] **State file** or board schema documented
- [ ] Loop **reads** prior state at start of every run
- [ ] Loop **writes** outcomes, timestamps, last actions
- [ ] **Prune** resolved/merged/closed items every run
- [ ] Human overrides recorded in state

## 6. Human Handoff

- [ ] **Escalation triggers** explicit (max attempts, risk paths, ambiguity)
- [ ] **Denylist paths** — auth, payments, secrets, infra (see [safety.md](./safety.md))
- [ ] **Notification rule** — only ping human when action required
- [ ] **Inbox** — where ambiguous items land (STATE.md section, Slack, Linear)

## 7. Connectors (MCP)

- [ ] Minimum permissions for connectors (read vs write)
- [ ] Loop can **open/update PRs** or tickets if acting, not just suggest
- [ ] Bot identity clear on PR comments (e.g. "Loop Engineering — PR Babysitter")

## 8. Cost & Limits

- [ ] **Token budget** estimated (`npx @cobusgreyling/loop-cost`, [operating-loops.md](./operating-loops.md))
- [ ] **`loop-budget.md`** with daily caps and kill switch
- [ ] **`loop-run-log.md`** for append-only run history
- [ ] **`loop-budget` skill** checks spend at start/end of each run
- [ ] **Max iterations** per item per run
- [ ] **Max auto-PRs** per day (cleanup loops)
- [ ] **Pause/kill** criteria defined

## 9. Observability

- [ ] **Log each run**: started, items found, actions taken, escalations
- [ ] **Success metrics** chosen (see pattern docs)
- [ ] Team can **inspect state file** without reading chat logs

## 10. Safety

- [ ] No auto-merge without explicit allowlist
- [ ] Secrets/env files in denylist
- [ ] Flake handling — don't "fix" intermittent tests with retries alone

---

## Readiness Levels

| Level | Description | Checklist |
|-------|-------------|-----------|
| **L0 — Draft** | Documented intent only | §1 |
| **L1 — Report** | Triage → state, no auto-action | §1–3, §5 |
| **L2 — Assisted** | Small auto-fixes with verifier | §1–7 |
| **L3 — Unattended** | Runs without you watching | All sections |

Run `loop-audit` in `tools/loop-audit/` to get a numeric Loop Readiness Score for your project.

## Quick Red Flags

Stop and fix before continuing if:

- Same PR has had >3 automated fix attempts without progress
- Verifier is the same agent session as implementer
- No state file — loop has amnesia every run
- Notifications on every run regardless of findings
- Auto-merge enabled without path allowlist