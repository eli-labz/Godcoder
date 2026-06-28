import { getDefaultTitleFromPrompt } from '../../src/main/session/session-title-utils';
import { maybeGenerateSessionTitle } from '../../src/main/session/session-title-flow';

type HarnessOptions = {
  generatedTitle: string | null;
  latestTitle?: string;
  /** Controls what updateTitle returns; defaults to true */
  updateTitleResult?: boolean;
};

export function createTitleFlowHarness(options: HarnessOptions) {
  let updatedTitle: string | null = null;
  let currentTitle = '';
  const latestTitle = options.latestTitle ?? null;
  const attemptedSessions = new Set<string>();
  const sessionId = 'session-1';
  const updateTitleResult = options.updateTitleResult ?? true;

  const runFirstMessage = async (prompt: string) => {
    currentTitle = getDefaultTitleFromPrompt(prompt);
    await maybeGenerateSessionTitle({
      sessionId,
      prompt,
      userMessageCount: 1,
      currentTitle,
      hasAttempted: attemptedSessions.has(sessionId),
      generateTitle: async () => options.generatedTitle,
      getLatestTitle: () => latestTitle ?? currentTitle,
      markAttempt: () => {
        attemptedSessions.add(sessionId);
      },
      updateTitle: async (title) => {
        if (updateTitleResult) {
          updatedTitle = title;
          currentTitle = title;
        }
        return updateTitleResult;
      },
      log: () => undefined,
    });
  };

  return {
    runFirstMessage,
    get updatedTitle() {
      return updatedTitle;
    },
    get hasAttempted() {
      return attemptedSessions.has(sessionId);
    },
  };
}
