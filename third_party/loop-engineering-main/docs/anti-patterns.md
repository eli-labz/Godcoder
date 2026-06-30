# Anti-Patterns

Design mistakes to avoid **before** enabling unattended loops. For runtime incidents, see [failure-modes.md](./failure-modes.md).

## 1. Same agent implements and verifies

**Anti-pattern**: One session marks its own work "done" after running tests once.

**Why it fails**: Confirmation bias; weak tests get rubber-stamped.

**Do instead**: Separate verifier sub-agent, model, or `/goal` checker. Verifier default stance: REJECT.

## 2. No attempt cap

**Anti-pattern**: "Keep trying until CI is green."

**Why it fails**: Infinite fix loops, token burn, merge of wrong fixes.

**Do instead**: Hard cap (e.g. 3 attempts) → escalate with full context in state file.

## 3. Vague triage output

**Anti-pattern**: Triage skill returns paragraphs of narrative.

**Why it fails**: Loop cannot parse priorities; humans ignore STATE.md.

**Do instead**: Structured markdown sections with one-line items and explicit `Suggested loop action`.

## 4. L3 before L1 quality

**Anti-pattern**: Auto-fix and auto-PR on day one.

**Why it fails**: Loop acts on bad signal; comprehension debt explodes.

**Do instead**: L1 report-only week one. Measure triage accuracy before enabling L2.

## 5. Shared state without schema

**Anti-pattern**: Three loops append to one unstructured STATE.md.

**Why it fails**: State rot, conflicting actions, ghost items.

**Do instead**: One state file per pattern, or clearly separated sections with prune rules.

## 6. MCP with write-everything scope

**Anti-pattern**: Loop can merge PRs, post to Slack, and edit production tickets on day one.

**Why it fails**: Blast radius of a bad triage decision is huge.

**Do instead**: L1 read-only connectors. Expand scope only after trust is earned.

## 7. No kill switch

**Anti-pattern**: Loop runs 24/7 with no pause criteria.

**Why it fails**: Alert fatigue, budget overrun, weekend incidents.

**Do instead**: Document pause/kill in LOOP.md + `templates/loop-budget.md.template`.

## 8. Fixing flakes with code

**Anti-pattern**: CI Sweeper changes application code when classification is `flake`.

**Why it fails**: Masks infra problems; introduces random diffs.

**Do instead**: Classify → quarantine or retry policy → escalate env/infra failures.

## 9. Auto-merge without allowlist

**Anti-pattern**: "Verifier passed, merge it."

**Why it fails**: Security and business-logic bugs pass weak verifiers.

**Do instead**: Explicit path allowlist; human merge for denylist paths per [safety.md](./safety.md).

## 10. No run log

**Anti-pattern**: Only STATE.md, no history of what the loop did.

**Why it fails**: Cannot debug "why did it do that Tuesday?"

**Do instead**: Append to `loop-run-log.md` per [operating-loops.md](./operating-loops.md).