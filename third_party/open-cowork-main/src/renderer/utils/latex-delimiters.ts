/**
 * Convert LaTeX-standard delimiters to dollar-sign delimiters.
 * remark-math only recognises $…$ / $$…$$, but many models emit \(…\) / \[…\].
 * Code blocks (fenced and inline) are preserved to avoid false conversions.
 */
/**
 * Convert LaTeX-standard delimiters to dollar-sign delimiters.
 * remark-math only recognises $…$ / $$…$$, but many models emit \(…\) / \[…\].
 * Code blocks (fenced and inline) are preserved to avoid false conversions.
 */
export function normalizeLatexDelimiters(text: string): string {
  if (!text) return text;

  const preserved: string[] = [];
  // Use a long multi-char sentinel (NUL + SOH + tag + index + NUL) that is
  // highly unlikely to occur naturally in any model output.
  const OPEN = '\x00\x01LTX[';
  const CLOSE = ']\x01\x00';

  const protect = (m: string): string => {
    preserved.push(m);
    return `${OPEN}${preserved.length - 1}${CLOSE}`;
  };

  // 1. Protect fenced code blocks (``` … ```)
  let out = text.replace(/```[\s\S]*?```/g, protect);

  // 2. Protect inline code (` … `)
  out = out.replace(/`[^`\n]+`/g, protect);

  // 3. \(…\) → $…$  (inline math)
  out = out.replace(/\\\(([\s\S]+?)\\\)/g, (_, c) => `$${c}$`);

  // 4. \[…\] → $$…$$ (display math, may span lines)
  out = out.replace(/\\\[([\s\S]+?)\\\]/g, (_, c) => `$$${c}$$`);

  // 5. Restore protected blocks
  // eslint-disable-next-line no-control-regex
  out = out.replace(/\x00\x01LTX\[(\d+)\]\x01\x00/g, (_, i) => preserved[+i]);

  return out;
}
