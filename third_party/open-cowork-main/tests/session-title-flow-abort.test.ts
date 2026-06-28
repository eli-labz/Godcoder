import { describe, expect, it, vi } from 'vitest';
import { maybeGenerateSessionTitle } from '../src/main/session/session-title-flow';
import { getDefaultTitleFromPrompt } from '../src/main/session/session-title-utils';

// Helper to build a minimal, fully-populated deps object
function makeDeps(overrides: Partial<Parameters<typeof maybeGenerateSessionTitle>[0]> = {}) {
  const prompt = '帮我写一份总结报告';
  return {
    sessionId: 'session-x',
    prompt,
    userMessageCount: 1,
    currentTitle: getDefaultTitleFromPrompt(prompt),
    hasAttempted: false,
    generateTitle: vi.fn(async () => '总结报告'),
    getLatestTitle: () => getDefaultTitleFromPrompt(prompt),
    markAttempt: vi.fn(),
    updateTitle: vi.fn(async () => true),
    log: vi.fn(),
    ...overrides,
  };
}

// ------------------------------------------------------------------
// Abort scenarios
// ------------------------------------------------------------------
describe('maybeGenerateSessionTitle — abort scenarios', () => {
  it('skips generation when shouldAbort returns true before start', async () => {
    const deps = makeDeps({ shouldAbort: () => true });
    await maybeGenerateSessionTitle(deps);
    expect(deps.generateTitle).not.toHaveBeenCalled();
    expect(deps.updateTitle).not.toHaveBeenCalled();
    expect(deps.markAttempt).not.toHaveBeenCalled();
  });

  it('skips updating when shouldAbort returns true after generation', async () => {
    let callCount = 0;
    // shouldAbort returns false on the first call (before generation), true on second (after)
    const shouldAbort = () => {
      callCount += 1;
      return callCount > 1;
    };
    const deps = makeDeps({ shouldAbort });
    await maybeGenerateSessionTitle(deps);
    expect(deps.generateTitle).toHaveBeenCalledTimes(1);
    expect(deps.updateTitle).not.toHaveBeenCalled();
  });
});

// ------------------------------------------------------------------
// Generator exception handling
// ------------------------------------------------------------------
describe('maybeGenerateSessionTitle — generator exception handling', () => {
  it('does not propagate exceptions thrown by generateTitle', async () => {
    const deps = makeDeps({
      generateTitle: vi.fn(async () => {
        throw new Error('Network error');
      }),
    });
    // Should resolve without throwing
    await expect(maybeGenerateSessionTitle(deps)).resolves.toBeUndefined();
    expect(deps.updateTitle).not.toHaveBeenCalled();
    expect(deps.markAttempt).not.toHaveBeenCalled();
  });

  it('does not update title when generator returns null', async () => {
    const deps = makeDeps({ generateTitle: vi.fn(async () => null) });
    await maybeGenerateSessionTitle(deps);
    expect(deps.updateTitle).not.toHaveBeenCalled();
    expect(deps.markAttempt).not.toHaveBeenCalled();
  });

  it('does not update title when generator returns empty string', async () => {
    const deps = makeDeps({ generateTitle: vi.fn(async () => '') });
    await maybeGenerateSessionTitle(deps);
    expect(deps.updateTitle).not.toHaveBeenCalled();
  });

  it('does not update title when generator returns a placeholder like "(no content)"', async () => {
    const deps = makeDeps({ generateTitle: vi.fn(async () => '(no content)') });
    await maybeGenerateSessionTitle(deps);
    expect(deps.updateTitle).not.toHaveBeenCalled();
  });
});

// ------------------------------------------------------------------
// Skip conditions
// ------------------------------------------------------------------
describe('maybeGenerateSessionTitle — skip conditions', () => {
  it('skips when userMessageCount is not 1', async () => {
    const deps = makeDeps({ userMessageCount: 2 });
    await maybeGenerateSessionTitle(deps);
    expect(deps.generateTitle).not.toHaveBeenCalled();
  });

  it('skips when already attempted', async () => {
    const deps = makeDeps({ hasAttempted: true });
    await maybeGenerateSessionTitle(deps);
    expect(deps.generateTitle).not.toHaveBeenCalled();
  });

  it('skips when title has already been customized by the user', async () => {
    const deps = makeDeps({ currentTitle: '用户自定义标题' });
    await maybeGenerateSessionTitle(deps);
    expect(deps.generateTitle).not.toHaveBeenCalled();
  });

  it('skips title update when title was changed externally after generation started', async () => {
    // The latest title no longer matches the initial title, indicating external edit
    const deps = makeDeps({
      getLatestTitle: () => '已被修改的标题',
    });
    await maybeGenerateSessionTitle(deps);
    expect(deps.updateTitle).not.toHaveBeenCalled();
    expect(deps.markAttempt).not.toHaveBeenCalled();
  });
});

// ------------------------------------------------------------------
// Happy path
// ------------------------------------------------------------------
describe('maybeGenerateSessionTitle — happy path', () => {
  it('calls updateTitle and markAttempt on successful generation', async () => {
    const deps = makeDeps();
    await maybeGenerateSessionTitle(deps);
    expect(deps.updateTitle).toHaveBeenCalledWith('总结报告');
    expect(deps.markAttempt).toHaveBeenCalledTimes(1);
  });

  it('strips surrounding quotes from generated title', async () => {
    const deps = makeDeps({ generateTitle: vi.fn(async () => '"Quoted Title"') });
    await maybeGenerateSessionTitle(deps);
    expect(deps.updateTitle).toHaveBeenCalledWith('Quoted Title');
  });
});
