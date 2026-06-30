import type { AuditResult } from './auditor.js';

const ICON = { ok: '✓', warn: '△', fail: '✗' } as const;

export function formatHuman(result: AuditResult): string {
  const lines: string[] = [];
  lines.push(`Goal Readiness Score: ${result.score}/100  (${result.level} — ${result.assessment})`);
  lines.push(`Target: ${result.target}`);
  lines.push('');
  for (const f of result.findings) {
    lines.push(`${ICON[f.level]} ${f.message}`);
  }
  if (result.recommendations.length > 0) {
    lines.push('');
    lines.push('Recommendations:');
    for (const r of result.recommendations) {
      lines.push(`  • ${r}`);
    }
  }
  return lines.join('\n');
}

export function formatJson(result: AuditResult): string {
  return JSON.stringify(result, null, 2);
}

export function formatMarkdown(result: AuditResult): string {
  const lines: string[] = [];
  lines.push('# Goal Readiness Audit');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Score | ${result.score}/100 |`);
  lines.push(`| Level | ${result.level} |`);
  lines.push(`| Assessment | ${result.assessment} |`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  for (const f of result.findings) {
    lines.push(`- ${ICON[f.level]} ${f.message}`);
  }
  if (result.recommendations.length > 0) {
    lines.push('');
    lines.push('## Recommendations');
    lines.push('');
    for (const r of result.recommendations) {
      lines.push(`- ${r}`);
    }
  }
  return lines.join('\n');
}