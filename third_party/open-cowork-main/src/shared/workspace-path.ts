import { isUncPath, isWindowsDrivePath } from './local-file-path';

export function resolvePathAgainstWorkspace(
  pathValue: string,
  workspacePath?: string | null
): string {
  if (!pathValue) {
    return pathValue;
  }

  if (isWindowsDrivePath(pathValue) || isUncPath(pathValue) || pathValue.startsWith('/')) {
    if (pathValue.startsWith('/workspace/')) {
      return workspacePath
        ? joinRelativePath(workspacePath, pathValue.slice('/workspace/'.length))
        : pathValue;
    }
    if (/^[A-Za-z]:[/\\]workspace[/\\]/i.test(pathValue)) {
      const relativePart = pathValue.replace(/^[A-Za-z]:[/\\]workspace[/\\]/i, '');
      return workspacePath ? joinRelativePath(workspacePath, relativePart) : pathValue;
    }
    return pathValue;
  }

  if (!workspacePath) {
    return pathValue;
  }

  return joinRelativePath(workspacePath, pathValue);
}

/**
 * Join base + relative path without Node.js `path` module (browser-safe).
 * Handles `.` and `..` segment normalization.
 */
function joinRelativePath(basePath: string, relativePath: string): string {
  const isWin = isWindowsDrivePath(basePath) || isUncPath(basePath);
  const sep = isWin ? '\\' : '/';

  const base = basePath.replace(/[/\\]+$/, '');
  const rel = relativePath.replace(/^[/\\]+/, '');
  const joined = `${base}${sep}${rel}`;

  // Normalize separators then resolve `.` / `..` segments
  const normalized = joined.replace(/[/\\]+/g, sep);
  const parts = normalized.split(sep);
  const resolved: string[] = [];

  // Determine the minimum number of parts that must remain to prevent
  // traversal above the path root:
  //   - UNC path  \\server\share  → splits to ['', '', 'server', 'share', …]
  //                                  floor = 4 (keep both empty + server + share)
  //   - Windows drive  C:\         → splits to ['C:', …]
  //                                  floor = 1
  //   - POSIX absolute /           → splits to ['', …]
  //                                  floor = 1
  const floor = isUncPath(basePath) ? 4 : 1;

  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..' && resolved.length > floor) {
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }

  const result = resolved.join(sep);

  // Post-resolve prefix check: ensure the path root prefix is preserved.
  // For POSIX paths the root is '/', for Windows drives it's 'X:', for UNC it's '\\\\server\\share'.
  const rootPrefix = isUncPath(basePath)
    ? parts.slice(0, 4).join(sep)
    : isWindowsDrivePath(basePath)
      ? parts[0] // e.g. 'C:'
      : ''; // POSIX: empty string is a valid prefix check; resolved always starts with '/'
  if (rootPrefix && !result.startsWith(rootPrefix)) {
    // Root prefix was stripped — traversal escaped the filesystem root; clamp to base
    return base;
  }

  return result;
}
