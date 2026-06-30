# Changelog

All notable changes to `@cobusgreyling/loop-audit` are documented here.

## [1.4.1] - 2026-06-13

### Changed
- Updated package description and keywords for better discoverability on npm / npx (emphasizes "loop engineering", coding agents, and concrete usage examples).

## [1.3.0] - 2026-06-09

### Added
- Unit tests for scoring logic (`test/auditor.test.ts`)
- `--suggest` now mentions `loop-init` scaffold CLI
- Registry and starter coverage in audit recommendations

### Changed
- CI gates on test suite before publish

## [1.2.0] - 2026-06-09

### Added
- `--suggest` copy-from-template commands for Grok, Claude Code, and Codex
- Expanded signals: MCP, worktree evidence, `patterns/registry.yaml`
- L3 scoring threshold with verifier + state requirements

## [1.1.0] - 2026-06-08

### Added
- `--md` markdown report format
- Safety doc and GitHub workflow detection

## [1.0.0] - 2026-06-07

### Added
- Initial Loop Readiness Score CLI (L0–L3)
- `--json` output for CI integration