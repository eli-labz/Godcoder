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

```
Your Machine ──► Model Provider (OpenAI / Anthropic / Any OpenAI-compatible API)
     ▲
     │  (no middleman, no cloud backend, no data lock-in)
     │
  Your Code
```

> **Reimagined from the ground up.** The original 2024 autonomous-dev pipeline is frozen under [`v1/`](./v1) — preserved, not maintained.

---

## ✨ What Godcoder Can Do

| Feature | Description |
|---|---|
| 🧠 **Ask / Plan / Coding Modes** | Three levels of autonomy — from answering questions to fully autonomous coding |
| 📝 **In-place File Editing** | Edit files, review diffs, rewind to checkpoints, continue from previous turns |
| 🖥️ **Interactive Terminal** | Built-in terminal, file explorer, and session history |
| 🔌 **Any LLM Provider** | Plug in OpenAI, Anthropic, or any OpenAI-compatible endpoint — no proxy needed |
| 🛠️ **MCP Server Support** | Extend the toolset with MCP servers over stdio, streamable HTTP, or SSE |
| 🎙️ **Voice API Integration** | Configure TTS, STT, and Voice-to-Voice from Settings — stored locally |
| 🔍 **Graph-Aware Code Search** | Optional Context Engine: semantic + structural search over large codebases |
| 🔒 **Tool Approval Controls** | Deliberate execution with subagents, skills, and approval gates |

---

## 🏗️ Architecture

Godcoder is built on a **pure-Rust agent core** with the desktop app as a thin adapter on top:

```
apps/desktop/          Tauri 2 + React desktop app (thin adapter)
crates/
  agent/               Rust agent core — the harness (loop, tools, modes, subagents)
  git-ops/             Checkpoint / diff / restore over the working tree
services/
  context-engine/      Optional Go indexing service (tree-sitter → Qdrant + FalkorDB + BM25)
v1/                    Legacy 2024 codegen pipeline — frozen
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

Flip on the **Context Engine** (`Settings → Context engine`) for graph-aware, repo-scale retrieval powered by:
- **tree-sitter** → syntax-aware parsing
- **Qdrant** → vector similarity search
- **FalkorDB** → call-graph traversal
- **BM25** → lexical search

The agent's `codebase_search` and `codebase_graph` tools query it automatically. See [services/context-engine/README.md](services/context-engine/README.md).

---

## 🛠️ Getting Started

> **Prebuilt binaries are coming.** For now, build from source — it's straightforward.

### Prerequisites

- **Rust** (stable) + [Tauri 2 system prerequisites](https://tauri.app/start/prerequisites/) for your OS
- **Node.js 20+** and npm
- _(Optional, for Context Engine)_ Docker with Compose

### Run the App

```bash
cd apps/desktop
npm install

# Development
npm run tauri:dev

# Production build
npm run tauri:build
```

> **Windows shortcut:** Double-click `launch-godcoder.bat` in the repo root — it sets up Cargo on PATH and starts the app automatically.

**On first launch:** Open Settings → add an LLM provider (`base_url` + `api_key` + `model`) → create a session → pick a folder and mode → start coding.

### (Optional) Run the Context Engine

```bash
cd services/context-engine
cp .env.example .env   # set SUPERCODER_OPENAI_API_KEY (server-side embedding key)
docker compose up -d --build
```

Then enable `Settings → Context engine` in the app. Full instructions: [services/context-engine/README.md](services/context-engine/README.md).

---

## 🗺️ Roadmap

- [ ] **Prebuilt releases & installers** — CI pipeline for binaries lands next
- [ ] **Benchmark harness** — headless runner over the same agent core, with reproducible per-task sandboxes to measure the harness across models and validate graph-retrieval localization
- [ ] **Broader provider support** — the provider abstraction is built to grow
- [x] Ask / Plan / Coding modes
- [x] Checkpoint & rewind
- [x] MCP server support
- [x] Voice API integration
- [x] Context Engine (local, graph-aware semantic search)

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

- 🐛 **Found a bug?** [Open an issue](https://github.com/eli-labz/Godcoder/issues/new)
- 💡 **Have an idea?** [Start a discussion](https://github.com/eli-labz/Godcoder/discussions)
- ⭐ **Like the project?** Give it a star — it helps more than you think!

---

## 📄 License

MIT © [eli-labz](https://github.com/eli-labz)

---

<div align="center">

**If Godcoder saves you time, please consider giving it a ⭐ — it helps the project grow!**

</div>
