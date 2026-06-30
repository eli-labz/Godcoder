import type { AuditResult } from './auditor.js';
/** Markdown badge for README — paste output from `loop-audit . --badge`. */
export declare function formatBadge(r: AuditResult): string;
export declare function formatHuman(r: AuditResult): string;
export declare function formatJson(r: AuditResult): string;
export declare function formatMarkdown(r: AuditResult): string;
