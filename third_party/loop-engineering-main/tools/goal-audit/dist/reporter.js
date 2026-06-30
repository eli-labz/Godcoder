const ICON = { ok: '✓', warn: '△', fail: '✗' };
export function formatHuman(result) {
    const lines = [];
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
export function formatJson(result) {
    return JSON.stringify(result, null, 2);
}
export function formatMarkdown(result) {
    const lines = [];
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
//# sourceMappingURL=reporter.js.map