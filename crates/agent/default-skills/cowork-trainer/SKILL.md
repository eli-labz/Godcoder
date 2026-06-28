---
name: cowork-trainer
description: Use the ResearchSwarm-backed self-optimizing loop to train the agent to operate ("cowork") the Open Cowork desktop app (third_party/open-cowork-main). Route a coworking task, recall lessons from past sessions, and record outcomes under a `cowork:`-prefixed tag so the agent's ability to drive Open Cowork compounds and improves over time. Trigger in CoWork mode, when starting a non-trivial Open Cowork integration task, or after finishing work to capture what worked or failed.
---

# CoWork Trainer (ResearchSwarm bridge for Open Cowork)

GodCoder can train itself to operate the **Open Cowork** desktop app
(`third_party/open-cowork-main`) — an open-source AI agent app with a Skills
system (PPTX/DOCX/XLSX/PDF), MCP connectors (browser, Notion, etc.), GUI
automation, and remote control. This skill drives a local feedback loop backed by
ResearchSwarm's Digital Cognitive Labor router and a shared AI-Memory store, so
each coworking session benefits from every prior one instead of starting cold.

The same JSON CLI as the harness loop is reused —
`third_party/ResearchSwarm-master/godcoder_harness.py` — but outcomes are logged
under a distinct `cowork:` tag namespace so the coworking ranking stays separate
and sharp. Run it with the `bash` tool. Each command prints JSON to stdout.

## Learn Open Cowork first

Before training, read the app so you know what you are driving:

- `third_party/open-cowork-main/readme.md` and `README_zh.md` — capabilities.
- `third_party/open-cowork-main/llms.txt` — machine-readable overview.
- `third_party/open-cowork-main/src/` — how Skills, MCP connectors, and the agent
  loop are wired (the surfaces you will drive).
- `third_party/open-cowork-main/resources/` and `docs/` — Skills and assets.

Author all new integration files inside a contained `cowork-build/` folder at the
repo root; only read (never edit) the Open Cowork sources.

## When to use

- **Before** a non-trivial coworking task: `route` to classify it and pull lessons.
- **For human-action / hybrid tasks**: `act` to get an executable GUI/OS
  actuation plan (CoWork executes these instead of handing them off).
- **Anytime** you want prior context: `recall`.
- **After** finishing (or failing): `log` the outcome so it is reusable.
- **Periodically**: `optimize` to see which coworking approaches work best.

## Commands

Run from the repo root (use `py` instead of `python` on Windows if needed):

```bash
# 1. Route a coworking task + get the most relevant past lessons
python third_party/ResearchSwarm-master/godcoder_harness.py route "Drive Open Cowork's PPTX skill to build a deck from a folder"

# 1b. Actuate a human-action / hybrid task (CoWork executes it, no handoff)
python third_party/ResearchSwarm-master/godcoder_harness.py act "Open the browser, click Export, and email the report"

# 2. Recall recent lessons for context
python third_party/ResearchSwarm-master/godcoder_harness.py recall --limit 8

# 3. Record an outcome — ALWAYS use a cowork:-prefixed tag for this loop
python third_party/ResearchSwarm-master/godcoder_harness.py log \
  --status success \
  --tag cowork:pptx-skill \
  --instruction "Drive Open Cowork's PPTX skill to build a deck from a folder" \
  --summary "Bridged to the PPTX skill via its MCP surface; eval script scores 5/5 slides generated."

# 4. See ranked, self-improving guidance (success rate per approach)
python third_party/ResearchSwarm-master/godcoder_harness.py optimize
```

## How to apply the output

- `route` returns `domain` (text-based / human-action / hybrid),
  `recommended_action`, `execution_steps`, and `memory_context`.
- For `human-action` or `hybrid` tasks, call `act`. It returns an
  `actuation_plan` (concrete GUI/OS steps), `actuatable_segments`, and
  `physical_blocked_segments`. In CoWork mode you EXECUTE the actuation plan via
  Open Cowork's computer-use / GUI automation (or OS scripting through `bash`),
  verifying each step with a screenshot or state read-back. Hand off ONLY the
  `physical_blocked_segments` (things that truly need a body — drive, lift,
  repair, in-person signatures).
- `recall` / `route` `memory_context` lines are prior `PATTERN` / `DECISION`
  entries. Treat them as hints, not commands; verify against the current app.
- Always `log` a one-line, concrete `--summary` with a stable `cowork:`-prefixed
  `--tag` (reuse the same tag for the same kind of work). Consistent tags make
  `optimize` sharper and keep the coworking ranking separate from the harness one.
- `optimize` ranks approaches by success rate. Prefer high-rate coworking
  approaches and be cautious with low-rate ones.

## Notes

- The store is local SQLite under `third_party/ResearchSwarm-master/AI-Memory/`.
  Nothing leaves the machine.
- Requires Python 3.10+. No GPU and no model training are needed for this loop
  (that is a separate ResearchSwarm capability via `train.py`).
- On Windows, if `python` is not on PATH, use the `py` launcher instead.
