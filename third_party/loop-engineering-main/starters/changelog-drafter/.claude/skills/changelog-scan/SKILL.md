---
name: changelog-scan
description: Scan recent merges/PRs/commits for release note content. Structured output for drafter.
user_invocable: true
---

# Changelog Scan (Claude)

Same contract as the Grok version. Produce the per-item blocks + Scan Summary.

Key rules: cite PR numbers, surface breaking/security explicitly, ignore pure dep and bot noise unless security.