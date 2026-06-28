import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function readSettingsSandboxContent(): string {
  const filePath = path.resolve(
    process.cwd(),
    'src/renderer/components/settings/SettingsSandbox.tsx'
  );
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

const settingsSandboxContent = readSettingsSandboxContent();

describe('SettingsSandbox status display', () => {
  it('does not show the stale Coming Soon placeholder', () => {
    expect(settingsSandboxContent).not.toContain("t('sandbox.comingSoon')");
    expect(settingsSandboxContent).not.toContain('🚧');
  });

  it('renders real sandbox status details when sandbox is enabled', () => {
    expect(settingsSandboxContent).toContain('const sandboxStatusText =');
    expect(settingsSandboxContent).toContain("t('sandbox.readyStatus')");
    expect(settingsSandboxContent).toContain("t('sandbox.notReadyStatus')");
    expect(settingsSandboxContent).toContain("t('sandbox.disabledStatus')");
    expect(settingsSandboxContent).toContain('{sandboxEnabled && (');
    expect(settingsSandboxContent).not.toContain('{false && sandboxEnabled && (');
  });
});
