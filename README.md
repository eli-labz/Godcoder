<div align="center">

# ⚡ Godcoder

### A local-first, open-source AI coding agent for your desktop.

**Bring your own LLM key. Your code never leaves your machine.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Rust](https://img.shields.io/badge/Built%20with-Rust-orange?logo=rust)](https://www.rust-lang.org/)
[![Tauri 2](https://img.shields.io/badge/Tauri-2.0-blue?logo=tauri)](https://tauri.app/)
[![Stars](https://img.shields.io/github/stars/eli-labz/Godcoder?style=social)](https://github.com/eli-labz/Godcoder/stargazers)
[![Forks](https://img.shields.io/github/forks/eli-labz/Godcoder?style=social)](https://github.com/eli-labz/Godcoder/network/members)

[**Download**](#getting-started) · [**Features**](#what-godcoder-can-do) · [**Architecture**](ARCHITECTURE.md) · [**Contribute**](CONTRIBUTING.md)

</div>

---

## 🚀 What is Godcoder?

Godcoder is a **local-first, fully open-source AI coding agent** that runs as a native desktop app. Unlike cloud-based tools, your source code never transits a vendor backend — API requests go straight from your machine to whichever model provider you configure.

It goes beyond editing code: Godcoder can **build and continuously improve its own agent harness** (Harness mode) and **self-train to drive the Open Cowork desktop app**, even **executing human-action tasks** — clicking, typing, opening apps, sending email, e-signing — through GUI/OS automation (CoWork mode). Both modes run a self-optimizing loop that compounds lessons over time, so the agent gets measurably better with use.

```
Your Machine ──► Model Provider (OpenAI / Anthropic / Any OpenAI-compatible API)
     ▲
     │  (no middleman, no cloud backend, no data lock-in)
     │
  Your Code
```

> Reimagined from the ground up. The original 2024 autonomous-dev pipeline is frozen under `v1/` — preserved, not maintained.

---

## 🧬 The Agent Builds Its Own Harness — Live

> **Godcoder doesn't just use a harness. It writes one, improves it, and optimizes it — autonomously, in real time.**

This is the defining capability that sets Godcoder apart. Activate **Harness mode** and the agent takes over its own agent loop: it scaffolds a live sandbox, engineers its own tools and workflows, runs improvement cycles, measures what works, and compounds that knowledge — all without you writing a single prompt.

```
┌─────────────────────────────────────────────────────────────┐
│              HARNESS MODE  —  Real-Time Self-Build          │
│                                                             │
│  START                                                      │
│    │                                                        │
│    ▼                                                        │
│  🏗️  Scaffold  →  creates harness-build/ sandbox            │
│    │                                                        │
│    ▼                                                        │
│  🗺️  Route     →  selects the highest-value next change     │
│    │                                                        │
│    ▼                                                        │
│  📋  Plan      →  designs the improvement                   │
│    │                                                        │
│    ▼                                                        │
│  ⚙️  Execute   →  writes, edits, runs code                  │
│    │                                                        │
│    ▼                                                        │
│  ✅  Evaluate  →  verifies with the project's own checks    │
│    │                                                        │
│    ▼                                                        │
│  📝  Log       →  records outcome in persistent memory      │
│    │                                                        │
│    ▼                                                        │
│  🔁  Optimize  →  biases future iterations toward success   │
│    │                                                        │
│    └──────────────────────────────► repeat                  │
└─────────────────────────────────────────────────────────────┘
```

**How it works:**
- Pick **Harness** in the new-session composer and press start — no prompt to type, no folder to choose.
- The agent instantly creates a dedicated `harness-build/` workspace, opens it in your file explorer, and confines all new work there — reading the rest of the repo for reference but never rewriting it.
- Each iteration makes **one decisive, verifiable change**: keep it if it's an improvement, discard it otherwise.
- Results are stored in a **persistent memory store** (via the ResearchSwarm bridge) so lessons from past runs rank and steer future iterations — the harness compounds knowledge over time.
- Like Freestyle mode, every tool call is auto-approved after the first confirmation.

The loop is powered by the [`self-optimizing-harness`](./crates/agent/default-skills/) default skill and a [ResearchSwarm bridge](./third_party/ResearchSwarm-master/godcoder_harness.py) exposing `route` / `log` / `recall` / `optimize` over a persistent memory store.

---

## ✨ What Godcoder Can Do

| Feature | Description |
|---|---|
| 🧬 **Real-Time Self-Built Harness** | The agent scaffolds, writes, and optimizes its own agent harness live — no human prompting required |
| 🧠 **Ask / Plan / Coding / Freestyle / Harness / CoWork Modes** | From answering questions to fully autonomous coding — self-building its own harness, and self-training to drive the Open Cowork desktop app |
| 📝 **In-place File Editing** | Edit files, review diffs, rewind to checkpoints, continue from previous turns |
| 🖥️ **Interactive Terminal** | Built-in terminal, file explorer, and session history |
| 🔌 **Any LLM Provider** | Plug in OpenAI, Anthropic, or any OpenAI-compatible endpoint — no proxy needed |
| 🛠️ **MCP Server Support** | Extend the toolset with MCP servers over stdio, streamable HTTP, or SSE |
| 🎙️ **Voice API Integration** | Configure TTS, STT, and Voice-to-Voice from Settings — stored locally |
| 🔍 **Graph-Aware Code Search** | Optional Context Engine: semantic + structural search over large codebases |
| 🔒 **Tool Approval Controls** | Deliberate execution with subagents, skills, and approval gates |
| 👥 **Self-training CoWork** | One-click **CoWork** mode learns to drive Open Cowork and **executes human-action tasks** (GUI/OS automation) |

---

## 👥 Self-training CoWork (drives Open Cowork)

**CoWork mode** turns Godcoder loose on the **Open Cowork** desktop app
([`third_party/open-cowork-main`](./third_party/open-cowork-main)) — learning to
operate its Skills (PPTX/DOCX/XLSX/PDF), MCP connectors, and computer-use surface,
and getting better at it over time. Pick **CoWork** in the new-session composer
next to **Harness**. You can **add a prompt** describing the objective you want
it to accomplish — or just press start to let it self-train. Either way it sets
up a contained `cowork-build/` sandbox, **opens it in your file explorer**, and
confines its new work there while reading Open Cowork only for reference.

What sets CoWork apart: it doesn't just plan — it **executes human-action tasks**.
For any step a person would do at a keyboard or screen (clicking, typing, opening
apps, filling forms, sending email, e-signing, joining meetings), CoWork gets an
actuation plan via the bridge's **`act`** command and carries it out through Open
Cowork's computer-use / GUI automation (or OS scripting), verifying each step with
a screenshot. Only steps that truly need a physical body (drive, lift, repair,
in-person signature) are handed back to you.

> **route → plan → execute (incl. GUI/OS actuation) → verify → log → optimize → repeat**

The loop is backed by the **`cowork-trainer`** default skill, the same
**ResearchSwarm bridge** (now also exposing **`act`**), and a digital-cognitive-
labor classifier that splits each task into digital, actuatable, and physical
segments. Outcomes are logged under `cowork:`-prefixed tags so coworking lessons
compound. Like Freestyle and Harness, every tool call is auto-approved (you
confirm the first time), and a **Clear** button in the session header resets the
conversation and context whenever you want a fresh start.

---

## 🏗️ Architecture

Godcoder is built on a **pure-Rust agent core** with the desktop app as a thin adapter on top:

```
apps/desktop/           Tauri 2 + React desktop app (thin adapter)
crates/
  agent/                Rust agent core — the harness (loop, tools, modes, subagents)
  git-ops/              Checkpoint / diff / restore over the working tree
services/
  context-engine/       Optional Go indexing service (tree-sitter → Qdrant + FalkorDB + BM25)
third_party/
  ResearchSwarm-master/  Self-optimizing memory + bridge (Harness & CoWork modes)
  open-cowork-main/      Open Cowork desktop app — CoWork mode's training target
v1/                     Legacy 2024 codegen pipeline — frozen
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for a deep-dive on how these fit together.

---

## 🔥 Two Ways to Run

### Mode 1 — Core Agent (Zero backend required)

Add an LLM key and you're immediately productive:

- ✅ In-place file edits
- ✅ Ask / Plan / Coding modes
- ✅ Checkpoint & rewind
- ✅ Diff review
- ✅ Interactive terminal & file explorer

### Mode 2 — Core Agent + Context Engine

Flip on the Context Engine (Settings → Context engine) for graph-aware, repo-scale retrieval powered by:

- **tree-sitter** → syntax-aware parsing
- **Qdrant** → vector similarity search
- **FalkorDB** → call-graph traversal
- **BM25** → lexical search

The agent's `codebase_search` and `codebase_graph` tools query it automatically. See [services/context-engine/README.md](services/context-engine/README.md).

---

## 🛠️ Getting Started

Prebuilt binaries are coming. For now, build from source — it's straightforward.

### Prerequisites

- Rust (stable) + [Tauri 2 system prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS
- Node.js 20+ and npm
- *(Optional, for Context Engine)* Docker with Compose

### Run the App

```bash
cd apps/desktop
npm install

# Development
npm run tauri:dev

# Production build
npm run tauri:build
```

> **Windows shortcut:** Double-click `launch-godcoder.bat` in the repo root — it sets up Cargo on PATH, refreshes stale Tauri build caches (important if the repo moved drives, e.g. `D:` -> `E:`), and starts the app automatically.

> **Windows brute-force integration path (optional):** Run `launch-godcoder-bruteforce.bat` to first force-install and validate `third_party/ResearchSwarm-master` and `third_party/loop-engineering-main`, then hand off to the normal launcher unchanged.
>
> During brute-force bootstrap on Windows, `loop-sync` is treated as required validation. Some vendored loop-engineering source builds (`loop-init`, `loop-cost`) can emit platform-specific warnings (`EPERM` rename / `chmod`) and are treated as optional so bootstrap can still complete.

On first launch: Open **Settings** → add an LLM provider (`base_url` + `api_key` + `model`) → create a session → pick a folder and mode → start coding.

### (Optional) Run the Context Engine

```bash
cd services/context-engine
cp .env.example .env   # set SUPERCODER_OPENAI_API_KEY (server-side embedding key)
docker compose up -d --build
```

Then enable **Settings → Context engine** in the app. Full instructions: [services/context-engine/README.md](services/context-engine/README.md).

---

## 🗺️ Roadmap

- [ ] Prebuilt releases & installers — CI pipeline for binaries lands next
- [ ] Benchmark harness — headless runner over the same agent core, with reproducible per-task sandboxes to measure the harness across models and validate graph-retrieval localization
- [ ] Broader provider support — the provider abstraction is built to grow
- [x] Ask / Plan / Coding modes
- [x] **Self-optimizing Harness mode** — agent builds and improves its own harness in real time
- [x] Checkpoint & rewind
- [x] MCP server support
- [x] Voice API integration
- [x] Context Engine (local, graph-aware semantic search)

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

- 🐛 **Found a bug?** [Open an issue](https://github.com/eli-labz/Godcoder/issues)
- 💡 **Have an idea?** [Start a discussion](https://github.com/eli-labz/Godcoder/discussions)
- ⭐ **Like the project?** Give it a star — it helps more than you think!

---

## 📄 License

MIT © eli-labz

*If Godcoder saves you time, please consider giving it a ⭐ — it helps the project grow!*
