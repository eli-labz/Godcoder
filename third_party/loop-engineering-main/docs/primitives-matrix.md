# Primitives Matrix — Grok, Claude Code, Codex, OpenClaw, Cursor, Windsurf

Tool-agnostic loop design: the **capability** is what matters, not the product name. This matrix maps each primitive to how it appears in six major agent environments.

| Primitive | Job in the Loop | Grok Build TUI | Claude Code | Codex | OpenClaw | Cursor | Windsurf |
|-----------|-----------------|----------------|-------------|-------|----------|--------|----------|
| **Automations / Scheduling** | Discovery + triage on a cadence | `/loop [interval] <prompt>`, `scheduler_create` / `scheduler_list` / `scheduler_delete` (`recurring`, `durable`, `fireImmediately`), `monitor` for streaming events | `/loop`, scheduled tasks, cron, hooks, GitHub Actions | [Automations tab](https://developers.openai.com/codex/app/automations): project, prompt, cadence, environment; Triage inbox | [`openclaw cron`](https://docs.openclaw.ai/automation/cron-jobs) (`--cron` / `--every` / `--at`, isolated or main session); webhooks (`POST /hooks/agent`, `/hooks/wake`); heartbeat | Cloud Agents + **Automations** (cron, webhooks, Linear/GitHub/Slack triggers); foreground Agent chat for ad-hoc `/loop`-style prompts | Cascade **Workflows** (`/workflow-name`, manual invoke); pair with GitHub Actions or external cron for true scheduling |
| **Run-until-done** | Keep working until a verifiable condition holds | [`/goal`](https://github.com/cobusgreyling/goal-engineering) + `update_goal` — persistent objective across turns ([Goal Engineering](https://github.com/cobusgreyling/goal-engineering)) | `/goal` — separate model checks completion | `/goal` — pause/resume, verifiable stop condition | Recurring isolated cron with explicit stop condition in `--message`; delegate via `coding-agent` skill to external CLI; hand off bounded work to Goal Engineering | Agent mode + **hooks** (`.cursor/hooks.json`) for grind-until-green loops | Workflow steps with explicit verification checkpoints; **Memories** for cross-session continuity |
| **Worktrees** | Safe parallel execution | Subagents with `isolation: "worktree"`, background tasks | `git worktree`, `--worktree`, `isolation: worktree` on subagents | Built-in worktree per thread | `exec` + `git worktree` in agent workspace; `coding-agent` delegates to CLI backends; optional sandbox per agent | Git worktree per Composer / Cloud Agent task | Workspace isolation; multiple simultaneous Cascade sessions |
| **Skills** | Persistent project knowledge | `SKILL.md` in `.grok/skills/` or `~/.grok/skills/`; invoked by name | `SKILL.md` in `.claude/skills/` or project skills | [Agent Skills](https://developers.openai.com/codex/skills) — `$name` or implicit match | `SKILL.md` in `<workspace>/skills/`, `.agents/skills`, or `~/.openclaw/skills`; [AgentSkills](https://agentskills.io) spec; [ClawHub](https://clawhub.ai) + `openclaw skills install` | `.cursor/rules/*.mdc` (globs, `alwaysApply`), `AGENTS.md`, `.cursor/skills/` | `.devin/rules/` or `.windsurf/rules/` (persistent context); `.windsurf/workflows/` (reusable recipes) |
| **Plugins & Connectors** | Reach into real tools | MCP servers via `CallMcpTool` | MCP servers + plugins | Connectors (MCP) + plugins for distribution | MCP + channel plugins (Slack, Telegram, WhatsApp, etc.); browser automation plugin | MCP in settings; Cloud Agent sandbox with full connector access | MCP via Cascade settings / `mcp_config.json` |
| **Sub-agents** | Maker / checker split | `Task` tool with `subagent_type`, worktree isolation | Task subagents in `.claude/agents/`, agent teams | Subagents as TOML in `.codex/agents/` | `agents.list` multi-agent routing; isolated cron subagent orchestration; separate verifier agent id | Multi-agent mode, review mode, custom agents in `.cursor/agents/` | Multiple Cascades in parallel; workflow-orchestrated implementer → reviewer steps |
| **State / Memory** | Track what's done across runs | `STATE.md`, todos, durable scheduler state | `AGENTS.md`, progress files, Linear via MCP | Markdown or Linear via connector | `STATE.md`, `HEARTBEAT.md` in workspace; cron persisted in Gateway SQLite; Skill Workshop for skill proposals | `STATE.md`, `LOOP.md`, Cloud Agent memories | `STATE.md`, Cascade **Memories**, workflow run notes |

**Reference MCP server:** this repo ships [`tools/mcp-server/`](../tools/mcp-server/) — patterns, skills, state, budget, and safety docs as runtime-queryable MCP resources (reduces prompt stuffing). Config example: [`examples/mcp/loop-engineering.mcp.json`](../examples/mcp/loop-engineering.mcp.json).

## Scheduling Quick Reference

| Use case | Grok | Claude Code | Codex | OpenClaw | Cursor | Windsurf |
|----------|------|-------------|-------|----------|--------|----------|
| Every 5 minutes | `/loop 5m <prompt>` | `/loop 5m <prompt>` | Automation, 5m cadence | `openclaw cron create "*/5 * * * *" --session isolated --message "..."` | Automation cron trigger | External cron + `/workflow` or Action |
| Daily morning | `/loop 1d <prompt>` | Cron / `/loop 1d` | Automation, daily | `openclaw cron create "0 7 * * *" --tz ... --session isolated` + optional `--announce` | Automation daily + `AGENTS.md` context | Daily workflow + Memories |
| Until tests pass | [`/goal`](https://github.com/cobusgreyling/goal-engineering/blob/main/patterns/tests-green.md) + `goal-verifier` skill (or loop + verifier) | `/goal all tests pass` | `/goal` | Isolated cron + verifier in message, or `coding-agent` + external CLI | Hooks grind-until-green | Workflow with test/fix loop |
| Survive restart | `scheduler_create` with `durable: true` | Hooks + persisted config | Automation (server-side) | Cron jobs persist in Gateway SQLite | Cloud Agent + repo-persisted state | Memories + committed `STATE.md` |
| Event-driven (CI fail) | `monitor` or GitHub Action | GitHub Action + webhook | Automation + webhook | `POST /hooks/agent` or mapped webhooks | Automation on PR/issue events | GitHub Action triggers + `/workflow` |

## Skill Packaging

| Concept | Grok | Claude Code | Codex | OpenClaw | Cursor | Windsurf |
|---------|------|-------------|-------|----------|--------|----------|
| Authoring format | `SKILL.md` + optional scripts/references | Same | Same | Same ([AgentSkills](https://agentskills.io)) | `SKILL.md` or `.mdc` rules with frontmatter | Markdown rules + workflow files |
| Distribution | Copy to `.grok/skills/` or user skills dir | Plugin / copy to project | Plugin bundle | `<workspace>/skills/`, ClawHub, `openclaw skills install` | `.cursor/skills/` or `.cursor/rules/` | `.windsurf/rules/` + `.windsurf/workflows/` in repo |
| Invocation | Skill name in prompt or auto-match on description | `$skill-name` or implicit | `$skill-name` | Slash command or auto-injected in system prompt | Rules auto-apply by glob; skills on demand | `/workflow-name` or Rules always-on in Cascade |

## Sub-agent Patterns

| Split | When to use | Grok | Claude Code | Codex | OpenClaw | Cursor | Windsurf |
|-------|-------------|------|-------------|-------|----------|--------|----------|
| Implementer → Verifier | Any unattended code change | `Task` + different instructions/model | `.claude/agents/reviewer.md` | TOML agent with higher `reasoning_effort` | Separate `agents.list` id or verifier block in cron message | Review mode or second Cloud Agent pass | Second Cascade or workflow review step |
| Explorer → Implementer | Large unfamiliar codebase | `explore` subagent_type | Explorer agent | Fast read-only subagent | `--light-context` cron + follow-up isolated job | `@codebase` + plan mode first | Audit workflow (read-only) then implement |
| Triage only | Report-first loops | `loop-triage` skill | `$loop-triage` | Automation calls skill | `loop-triage` + isolated cron; restrict `--tools` | `AGENTS.md` + report-only rule | Triage workflow, no edit steps |

## State Conventions

Recommended filenames (pick one spine per project):

| File | Purpose |
|------|---------|
| `STATE.md` | General loop memory (daily triage) |
| `issue-triage-state.md` | Issue queue health (feeder for daily triage) |
| `pr-babysitter-state.md` | PR-specific watcher state |
| `ci-sweeper-state.md` | Active CI failures + attempt counts |
| `post-merge-state.md` | Cleanup backlog from recent merges |

Linear / GitHub Projects work equally well — the loop must **read and write** the same store every run.

## Choosing a Tool

You do not need to pick one forever. A well-designed loop transfers:

1. Write the **skill** (tool-agnostic `SKILL.md`)
2. Define the **state schema** (markdown or JSON)
3. Document the **verification split** (who checks whom)
4. Map scheduling to your current TUI, editor, or Action

See [examples/](../examples/) for the same pattern implemented across tools.

## Copy-paste starters (Daily Triage, L1)

| Tool | Starter |
|------|---------|
| Grok | [starters/minimal-loop](../starters/minimal-loop/) |
| Claude Code | [starters/minimal-loop-claude](../starters/minimal-loop-claude/) |
| Codex | [starters/minimal-loop-codex](../starters/minimal-loop-codex/) |
| OpenClaw | [examples/openclaw/daily-triage.md](../examples/openclaw/daily-triage.md) — copy `skills/` + `STATE.md`; no `loop-init` yet |
| Cursor / Windsurf | Copy `SKILL.md` + `STATE.md` from any starter; map scheduling to editor Automations or Workflows (see appendix) |

Audit after copying: `npx @cobusgreyling/loop-audit . --suggest`

Scaffold automatically: `npx @cobusgreyling/loop-init . --pattern daily-triage --tool grok`

## Goals (run-until-done)

Loops discover ongoing work; **goals finish bounded tasks**. Canonical reference: **[Goal Engineering](https://github.com/cobusgreyling/goal-engineering)** (`/goal`, `update_goal`, `GOAL.md`, `goal-verifier`).

| Handoff | Command |
|---------|---------|
| Loop found a fixable item | `/goal Read STATE.md top item. Complete per goal-engineering pattern. goal-verifier before done.` |
| Audit goal readiness | `npx @cobusgreyling/goal-audit . --suggest` |
| Goal vs loop decision | [goal-vs-loop.md](https://github.com/cobusgreyling/goal-engineering/blob/main/docs/goal-vs-loop.md) |

## Appendix: Editor transfer recipes (Cursor & Windsurf)

No dedicated starters yet — map capabilities to the same loop shape:

| Step | Cursor | Windsurf |
|------|--------|----------|
| 1. Skills | Copy `templates/SKILL.md.loop-triage` → `.cursor/skills/loop-triage/SKILL.md`; add always-on triage rules in `.cursor/rules/` | Copy skill content into `.windsurf/rules/loop-triage.md` |
| 2. State | `cp starters/minimal-loop/STATE.md.example STATE.md` | Same — commit `STATE.md` at repo root |
| 3. Scheduling | Cloud Automation (cron) or manual Agent prompt on cadence | Create `.windsurf/workflows/daily-triage.md`, invoke `/daily-triage` |
| 4. Verification | `.cursor/agents/loop-verifier.md` from `templates/SKILL.md.verifier` | Add review step at end of workflow; human gate on denylist paths |
| 5. Connectors | Enable GitHub MCP read-only for issue/PR discovery | Configure GitHub MCP in Cascade settings |

**Aider** (CLI-only): use `--watch` or scripted sessions; state in `STATE.md`; reviewer = second terminal session.

Transfer recipe: copy the tool-agnostic `SKILL.md` + state schema from this repo; map scheduling to your editor's automation surface.