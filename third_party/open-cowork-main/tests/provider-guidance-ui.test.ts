import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const configModalPath = path.resolve(process.cwd(), 'src/renderer/components/ConfigModal.tsx');
// SettingsPanel was split — API settings (including provider guidance) live in settings/SettingsAPI.tsx
const settingsPanelPath = path.resolve(process.cwd(), 'src/renderer/components/SettingsPanel.tsx');
const settingsDir = path.resolve(process.cwd(), 'src/renderer/components/settings');
const settingsPanelContent = [
  fs.readFileSync(settingsPanelPath, 'utf8'),
  ...fs.readdirSync(settingsDir).map((f) => fs.readFileSync(path.join(settingsDir, f), 'utf8')),
].join('\n');

describe('provider guidance UI wiring', () => {
  it('wires shared guidance UI into ConfigModal', () => {
    const source = fs.readFileSync(configModalPath, 'utf8');
    expect(source).toContain('CommonProviderSetupsCard');
    expect(source).toContain('GuidanceInlineHint');
    expect(source).toContain('onApplySetup={applyCommonProviderSetup}');
    expect(source).toContain('friendlyTestDetails');
  });

  it('wires shared guidance UI into SettingsPanel', () => {
    expect(settingsPanelContent).toContain('CommonProviderSetupsCard');
    expect(settingsPanelContent).toContain('GuidanceInlineHint');
    expect(settingsPanelContent).toContain('onApplySetup={applyCommonProviderSetup}');
    expect(settingsPanelContent).toContain('<ApiDiagnosticsPanel');
  });
});
