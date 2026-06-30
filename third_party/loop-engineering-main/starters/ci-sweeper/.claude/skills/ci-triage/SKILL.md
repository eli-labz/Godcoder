---
name: ci-triage
description: >
  Parse CI failures, identify failing job/step, classify as flake, regression,
  env, or config. Use in CI sweeper loops before any fix attempt.
user_invocable: true
---

# CI Triage Skill

## Output per failure

```markdown
### Failure — branch @ sha
- Job / step:
- Error (1-3 lines):
- Classification: flake | regression | env | config
- Actionable: yes | no
- Suggested loop action: minimal-fix | watch | escalate-human
```

## Classification Rules

- **flake**: intermittent, passed on retry, no code change
- **regression**: new failure correlated with recent commit
- **env**: runner, registry, secrets, quota
- **config**: workflow, dependency install, cache

Env failures → escalate-human. Do not "fix" with code changes.