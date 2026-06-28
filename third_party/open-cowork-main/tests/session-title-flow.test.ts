import { describe, it, expect } from 'vitest';
import { createTitleFlowHarness } from './support/session-title-harness';

describe('session title flow', () => {
  it('updates title after first user message when generator succeeds', async () => {
    const harness = createTitleFlowHarness({ generatedTitle: '简短标题' });
    await harness.runFirstMessage('帮我做一个PPT');
    expect(harness.updatedTitle).toBe('简短标题');
  });

  it('does not update when generator fails', async () => {
    const harness = createTitleFlowHarness({ generatedTitle: null });
    await harness.runFirstMessage('帮我做一个PPT');
    expect(harness.updatedTitle).toBe(null);
    expect(harness.hasAttempted).toBe(false);
  });

  it('does not override manual title changes', async () => {
    const harness = createTitleFlowHarness({
      generatedTitle: '简短标题',
      latestTitle: '手动标题',
    });
    await harness.runFirstMessage('帮我做一个PPT');
    expect(harness.updatedTitle).toBe(null);
    expect(harness.hasAttempted).toBe(false);
  });

  it('does not mark attempt when updateTitle returns false (session deleted during generation)', async () => {
    const harness = createTitleFlowHarness({
      generatedTitle: '简短标题',
      updateTitleResult: false,
    });
    await harness.runFirstMessage('帮我做一个PPT');
    // updatedTitle is null because updateTitle returned false
    expect(harness.updatedTitle).toBe(null);
    // hasAttempted must be false so next session start can retry
    expect(harness.hasAttempted).toBe(false);
  });
});
