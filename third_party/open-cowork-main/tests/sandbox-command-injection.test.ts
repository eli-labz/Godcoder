/**
 * Tests for sandbox command injection fixes.
 *
 * Validates that:
 * 1. sessionId is validated against a strict allowlist pattern
 * 2. WSL distro names are validated before use in shell commands
 * 3. Lima execLimaShellWithRetry uses execFileAsync (no host shell)
 * 4. WSL agent path is checked for shell metacharacters
 * 5. rm -rf verifies real path is within sandbox root before deletion
 * 6. SandboxSync.wslExec is async and captures stderr
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const sandboxSyncPath = path.resolve(process.cwd(), 'src/main/sandbox/sandbox-sync.ts');
const wslBridgePath = path.resolve(process.cwd(), 'src/main/sandbox/wsl-bridge.ts');
const limaBridgePath = path.resolve(process.cwd(), 'src/main/sandbox/lima-bridge.ts');
const limaSyncPath = path.resolve(process.cwd(), 'src/main/sandbox/lima-sync.ts');

const sandboxSyncSrc = fs.readFileSync(sandboxSyncPath, 'utf8');
const wslBridgeSrc = fs.readFileSync(wslBridgePath, 'utf8');
const limaBridgeSrc = fs.readFileSync(limaBridgePath, 'utf8');
const limaSyncSrc = fs.readFileSync(limaSyncPath, 'utf8');

describe('sandbox-sync sessionId validation', () => {
  it('defines a validateSessionId function with strict alphanumeric pattern', () => {
    expect(sandboxSyncSrc).toContain('if (!/^[a-zA-Z0-9_-]+$/.test(sessionId))');
    expect(sandboxSyncSrc).toContain('throw new Error(`Invalid sessionId: ${sessionId}`)');
  });

  it('calls validateSessionId at the top of initSync', () => {
    // validateSessionId should appear before any wslExec call in initSync
    const initSyncStart = sandboxSyncSrc.indexOf('static async initSync(');
    const validateCall = sandboxSyncSrc.indexOf('validateSessionId(sessionId)', initSyncStart);
    const firstWslExec = sandboxSyncSrc.indexOf('this.wslExec(', initSyncStart);
    expect(validateCall).toBeGreaterThan(initSyncStart);
    expect(validateCall).toBeLessThan(firstWslExec);
  });
});

describe('lima-sync sessionId validation', () => {
  it('defines a validateSessionId function with strict alphanumeric pattern', () => {
    expect(limaSyncSrc).toContain('if (!/^[a-zA-Z0-9_-]+$/.test(sessionId))');
  });

  it('calls validateSessionId at the top of initSync', () => {
    const initSyncStart = limaSyncSrc.indexOf('static async initSync(');
    const validateCall = limaSyncSrc.indexOf('validateSessionId(sessionId)', initSyncStart);
    const firstLimaExec = limaSyncSrc.indexOf('this.limaExec(', initSyncStart);
    expect(validateCall).toBeGreaterThan(initSyncStart);
    expect(validateCall).toBeLessThan(firstLimaExec);
  });
});

describe('wsl-bridge distro name validation', () => {
  it('has validateDistroName method with strict pattern', () => {
    expect(wslBridgeSrc).toContain('private static validateDistroName(distro: string)');
    expect(wslBridgeSrc).toContain('if (!/^[a-zA-Z0-9\\-_.]+$/.test(distro))');
  });

  it('validates distro at the top of installNodeInWSL', () => {
    const methodStart = wslBridgeSrc.indexOf('static async installNodeInWSL(distro: string)');
    const validateCall = wslBridgeSrc.indexOf('WSLBridge.validateDistroName(distro)', methodStart);
    expect(validateCall).toBeGreaterThan(methodStart);
    // Should be within the first few lines of the method
    expect(validateCall - methodStart).toBeLessThan(100);
  });

  it('validates distro at the top of installNodeViaNvm', () => {
    const methodStart = wslBridgeSrc.indexOf('static async installNodeViaNvm(distro: string)');
    const validateCall = wslBridgeSrc.indexOf('WSLBridge.validateDistroName(distro)', methodStart);
    expect(validateCall).toBeGreaterThan(methodStart);
    expect(validateCall - methodStart).toBeLessThan(100);
  });

  it('validates distro at the top of installPythonInWSL', () => {
    const methodStart = wslBridgeSrc.indexOf('static async installPythonInWSL(distro: string)');
    const validateCall = wslBridgeSrc.indexOf('WSLBridge.validateDistroName(distro)', methodStart);
    expect(validateCall).toBeGreaterThan(methodStart);
    expect(validateCall - methodStart).toBeLessThan(100);
  });

  it('validates distro at the top of installClaudeCodeInWSL', () => {
    const methodStart = wslBridgeSrc.indexOf('static async installClaudeCodeInWSL(distro: string)');
    const validateCall = wslBridgeSrc.indexOf('WSLBridge.validateDistroName(distro)', methodStart);
    expect(validateCall).toBeGreaterThan(methodStart);
    expect(validateCall - methodStart).toBeLessThan(100);
  });

  it('validates distro in installSkillDependencies', () => {
    const methodStart = wslBridgeSrc.indexOf(
      'static async installSkillDependencies(distro: string)'
    );
    const validateCall = wslBridgeSrc.indexOf('WSLBridge.validateDistroName(distro)', methodStart);
    expect(validateCall).toBeGreaterThan(methodStart);
  });

  it('validates distro in installPipInWSL', () => {
    const methodStart = wslBridgeSrc.indexOf('static async installPipInWSL(distro: string)');
    const validateCall = wslBridgeSrc.indexOf('WSLBridge.validateDistroName(distro)', methodStart);
    expect(validateCall).toBeGreaterThan(methodStart);
  });
});

describe('lima-bridge execLimaShellWithRetry uses execFileAsync', () => {
  it('imports execFile from child_process', () => {
    expect(limaBridgeSrc).toMatch(/import\s*\{[^}]*execFile[^}]*\}\s*from\s*'child_process'/);
  });

  it('creates execFileAsync via promisify', () => {
    expect(limaBridgeSrc).toContain('const execFileAsync = promisify(execFile)');
  });

  it('uses execFileAsync with argument array in execLimaShellWithRetry', () => {
    const fnStart = limaBridgeSrc.indexOf('const execLimaShellWithRetry');
    const fnEnd = limaBridgeSrc.indexOf('};', fnStart + 100);
    const fnBody = limaBridgeSrc.substring(fnStart, fnEnd);

    // Should use execFileAsync, not execAsync
    expect(fnBody).toContain('execFileAsync(');
    expect(fnBody).not.toContain('execAsync(');

    // Should pass arguments as array, not string interpolation
    expect(fnBody).toContain("['shell', LIMA_INSTANCE_NAME, '--', 'bash', '-c', command]");
  });
});

describe('wsl-bridge agent path metacharacter check', () => {
  it('validates wslAgentPath for shell metacharacters before use', () => {
    const startAgentStart = wslBridgeSrc.indexOf('private async startAgent()');
    const startAgentEnd = wslBridgeSrc.indexOf("log('[WSL] Agent is ready')", startAgentStart);
    const startAgentBody = wslBridgeSrc.substring(startAgentStart, startAgentEnd);

    // Should check for metacharacters
    expect(startAgentBody).toContain('/[;&|`$(){}]/.test(wslAgentPath)');
    expect(startAgentBody).toContain('throw new Error(`Invalid agent path: ${wslAgentPath}`)');
  });
});

describe('rm -rf symlink protection', () => {
  it('sandbox-sync verifies realpath before rm -rf', () => {
    const cleanupStart = sandboxSyncSrc.indexOf('static async cleanup(sessionId: string)');
    const cleanupEnd = sandboxSyncSrc.indexOf(
      '}',
      sandboxSyncSrc.indexOf("logError('[SandboxSync] Cleanup failed:", cleanupStart)
    );
    const cleanupBody = sandboxSyncSrc.substring(cleanupStart, cleanupEnd);

    expect(cleanupBody).toContain('realpath');
    expect(cleanupBody).toContain(SANDBOX_ROOT_CHECK);
    expect(cleanupBody).toContain('Refusing to delete');
  });

  it('lima-sync verifies realpath before rm -rf', () => {
    const cleanupStart = limaSyncSrc.indexOf('static async cleanup(sessionId: string)');
    const cleanupEnd = limaSyncSrc.indexOf(
      '}',
      limaSyncSrc.indexOf('logError(`[LimaSync] Cleanup error:', cleanupStart)
    );
    const cleanupBody = limaSyncSrc.substring(cleanupStart, cleanupEnd);

    expect(cleanupBody).toContain('realpath');
    expect(cleanupBody).toContain(SANDBOX_ROOT_CHECK);
    expect(cleanupBody).toContain('Refusing to delete');
  });
});

// Helper: the cleanup must verify the resolved path starts within the sandbox root
const SANDBOX_ROOT_CHECK = 'startsWith(';
describe('sandbox-sync wslExec is async with stderr capture', () => {
  it('does not use execFileSync', () => {
    expect(sandboxSyncSrc).not.toContain('execFileSync');
  });

  it('imports execFile and promisify for async execution', () => {
    expect(sandboxSyncSrc).toContain("import { execFile } from 'child_process'");
    expect(sandboxSyncSrc).toContain("import { promisify } from 'util'");
    expect(sandboxSyncSrc).toContain('const execFileAsync = promisify(execFile)');
  });

  it('uses execFileAsync in wslExec', () => {
    const wslExecStart = sandboxSyncSrc.indexOf('private static async wslExec(');
    const wslExecEnd = sandboxSyncSrc.indexOf(
      '}',
      sandboxSyncSrc.indexOf('return { stdout:', wslExecStart)
    );
    const wslExecBody = sandboxSyncSrc.substring(wslExecStart, wslExecEnd);

    expect(wslExecBody).toContain('await execFileAsync(');
    expect(wslExecBody).not.toContain('execFileSync');
  });

  it('captures and logs stderr', () => {
    const wslExecStart = sandboxSyncSrc.indexOf('private static async wslExec(');
    const wslExecEnd = sandboxSyncSrc.indexOf(
      '}',
      sandboxSyncSrc.indexOf('return { stdout:', wslExecStart)
    );
    const wslExecBody = sandboxSyncSrc.substring(wslExecStart, wslExecEnd);

    expect(wslExecBody).toContain('result.stderr');
    // Stderr should not be hardcoded as empty string
    expect(wslExecBody).not.toContain("stderr: ''");
  });
});
