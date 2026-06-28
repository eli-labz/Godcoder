# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 3.x (latest) | Yes |
| < 3.0 | No |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues by emailing **security@opencowork.ai** (or the maintainer contact listed in the repository). Include:

- A clear description of the vulnerability
- Steps to reproduce or a proof-of-concept
- Affected version(s)
- Potential impact assessment

### What to expect

- **Acknowledgement**: within 48 hours
- **Status update**: within 7 days
- **Fix timeline**: critical issues targeted within 14 days; others evaluated case-by-case

We will coordinate disclosure timing with you and credit reporters in the release notes unless you prefer to remain anonymous.

## Scope

In scope:
- Electron main process privilege escalation
- Arbitrary code execution via crafted input
- Credential / API key leakage
- Sandbox escape (Lima / WSL2 isolation)

Out of scope:
- Issues requiring physical access to a running machine
- Self-XSS or issues requiring the attacker to already have local code execution
- Vulnerabilities in third-party dependencies (report those upstream)

## Security Best Practices for Users

- Keep the app updated to the latest release.
- Store API keys only in the built-in credential store — never in plain text files.
- Review MCP server configurations before adding untrusted servers.
