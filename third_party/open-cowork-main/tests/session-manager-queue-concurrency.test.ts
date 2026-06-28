import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { DatabaseInstance } from '../src/main/db/database';

// --- Mocks (must be before SessionManager import) ---

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: () => '/tmp',
    getVersion: () => '0.0.0',
  },
}));

vi.mock('electron-store', () => {
  class MockStore<T extends Record<string, unknown>> {
    public store: Record<string, unknown>;
    public path = '/tmp/mock-queue-config-store.json';

    constructor(options: { defaults?: Record<string, unknown> }) {
      this.store = { ...(options?.defaults || {}) };
    }

    get<K extends keyof T>(key: K): T[K] {
      return this.store[key as string] as T[K];
    }

    set(key: string | Record<string, unknown>, value?: unknown): void {
      if (typeof key === 'string') {
        this.store[key] = value;
        return;
      }
      this.store = { ...this.store, ...key };
    }
  }

  return { default: MockStore };
});

vi.mock('../src/main/claude/agent-runner', () => ({
  ClaudeAgentRunner: class {
    run = vi.fn();
    cancel = vi.fn();
    handleQuestionResponse = vi.fn();
  },
}));

vi.mock('../src/main/mcp/mcp-config-store', () => ({
  mcpConfigStore: {
    getEnabledServers: () => [],
  },
}));

import { SessionManager } from '../src/main/session/session-manager';

// Helper: create a minimal mock DB
function createMockDb() {
  return {
    sessions: {
      create: vi.fn(),
      get: vi.fn(() => ({
        id: 's1',
        title: 'Test',
        created_at: Date.now(),
        updated_at: Date.now(),
        status: 'idle',
        cwd: '/tmp',
      })),
      getAll: vi.fn(() => []),
      update: vi.fn(),
      delete: vi.fn(),
    },
    messages: {
      create: vi.fn(),
      getBySessionId: vi.fn(() => []),
      delete: vi.fn(),
      deleteBySessionId: vi.fn(),
    },
    traceSteps: {
      create: vi.fn(),
      update: vi.fn(),
      getBySessionId: vi.fn(() => []),
      deleteBySessionId: vi.fn(),
    },
  } as unknown as DatabaseInstance;
}

describe('SessionManager processQueue concurrency', () => {
  let db: DatabaseInstance;
  let sendToRenderer: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    db = createMockDb();
    sendToRenderer = vi.fn();
  });

  it('activeSessions stays populated while pending items exist (no gap for duplicate queue)', async () => {
    const manager = new SessionManager(db, sendToRenderer);

    // Track activeSessions state via the public-facing status updates
    const statusUpdates: string[] = [];
    sendToRenderer.mockImplementation((msg: { type: string; payload: { status?: string } }) => {
      if (msg.type === 'session.status' && msg.payload.status) {
        statusUpdates.push(msg.payload.status);
      }
    });

    // Spy on processPrompt to simulate async work.
    // The first call resolves normally; we'll enqueue a second prompt during it.
    let resolveFirst!: () => void;
    let resolveSecond!: () => void;
    const firstCall = new Promise<void>((r) => { resolveFirst = r; });
    const secondCall = new Promise<void>((r) => { resolveSecond = r; });

    let callCount = 0;
    const processPromptSpy = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return firstCall;
      return secondCall;
    });

    // Replace the private processPrompt with our spy
    (manager as unknown as { processPrompt: typeof processPromptSpy }).processPrompt = processPromptSpy;

    // Also mock loadSession to return a session
    (manager as unknown as { loadSession: (id: string) => unknown }).loadSession = (id: string) => ({
      id,
      title: 'Test',
      created_at: Date.now(),
      updated_at: Date.now(),
      status: 'running' as const,
      cwd: '/tmp',
    });

    // Enqueue first prompt — starts processQueue
    (manager as unknown as { enqueuePrompt: (s: unknown, p: string) => void }).enqueuePrompt(
      { id: 's1', title: 'Test', created_at: Date.now(), updated_at: Date.now(), status: 'idle', cwd: '/tmp' },
      'first prompt',
    );

    // processQueue is now running and awaiting firstCall.
    // Enqueue a second prompt while the first is still processing.
    (manager as unknown as { enqueuePrompt: (s: unknown, p: string) => void }).enqueuePrompt(
      { id: 's1', title: 'Test', created_at: Date.now(), updated_at: Date.now(), status: 'idle', cwd: '/tmp' },
      'second prompt',
    );

    // Resolve the first call — the inner loop should pick up the second item
    // without ever leaving activeSessions.
    resolveFirst();
    await new Promise((r) => setTimeout(r, 10));

    // The second call should be in flight now.
    expect(processPromptSpy).toHaveBeenCalledTimes(2);

    // Resolve the second call to let processQueue finish cleanly.
    resolveSecond();
    await new Promise((r) => setTimeout(r, 10));

    // Status should be: running → idle (only ONE running/idle cycle, not two).
    const runningCount = statusUpdates.filter((s) => s === 'running').length;
    const idleCount = statusUpdates.filter((s) => s === 'idle').length;
    expect(runningCount).toBe(1);
    expect(idleCount).toBe(1);
  });

  it('finally block does not restart processQueue (no duplicate queue possible)', async () => {
    const manager = new SessionManager(db, sendToRenderer);

    // Track how many times processQueue is entered by spying on activeSessions.set
    let processQueueEntries = 0;
    const origProcessQueue = (manager as unknown as { processQueue: (s: unknown) => Promise<void> }).processQueue.bind(manager);
    (manager as unknown as { processQueue: (s: unknown) => Promise<void> }).processQueue = async (session: unknown) => {
      processQueueEntries++;
      return origProcessQueue(session);
    };

    // Mock processPrompt to resolve immediately
    (manager as unknown as { processPrompt: () => Promise<void> }).processPrompt = vi.fn().mockResolvedValue(undefined);
    (manager as unknown as { loadSession: (id: string) => unknown }).loadSession = (id: string) => ({
      id,
      title: 'Test',
      created_at: Date.now(),
      updated_at: Date.now(),
      status: 'running' as const,
      cwd: '/tmp',
    });

    // Enqueue two prompts at once — both should be processed in a single processQueue call
    (manager as unknown as { enqueuePrompt: (s: unknown, p: string) => void }).enqueuePrompt(
      { id: 's1', title: 'Test', created_at: Date.now(), updated_at: Date.now(), status: 'idle', cwd: '/tmp' },
      'prompt 1',
    );
    (manager as unknown as { enqueuePrompt: (s: unknown, p: string) => void }).enqueuePrompt(
      { id: 's1', title: 'Test', created_at: Date.now(), updated_at: Date.now(), status: 'idle', cwd: '/tmp' },
      'prompt 2',
    );

    await new Promise((r) => setTimeout(r, 50));

    // processQueue should have been entered exactly once (not re-entered from finally)
    expect(processQueueEntries).toBe(1);
  });
});

describe('SessionManager cache eviction', () => {
  it('does not evict when saving a message for an already-cached session', () => {
    const db = createMockDb();
    const manager = new SessionManager(db, vi.fn());

    // Fill the cache to MAX_CACHE_SIZE by fetching messages for many sessions.
    // getMessages populates the cache via messageCache.set.
    const MAX = 100; // SessionManager.MAX_CACHE_SIZE
    for (let i = 0; i < MAX + 1; i++) {
      const sid = `session-${i}`;
      (db.messages.getBySessionId as ReturnType<typeof vi.fn>).mockReturnValueOnce([
        {
          id: `m-${i}`,
          session_id: sid,
          role: 'user',
          content: JSON.stringify([{ type: 'text', text: `msg ${i}` }]),
          timestamp: i,
          token_usage: null,
        },
      ]);
      manager.getMessages(sid);
    }

    // At this point cache has 101 entries. The oldest is 'session-0'.
    // Save a message for 'session-0' (already cached) — this should NOT
    // trigger eviction and delete session-0's cache.
    manager.saveMessage({
      id: 'new-msg',
      sessionId: 'session-0',
      role: 'assistant',
      content: [{ type: 'text', text: 'reply' }],
      timestamp: 999,
    });

    // session-0 should still be cached and contain the new message
    const msgs = manager.getMessages('session-0');
    expect(msgs.some((m) => m.id === 'new-msg')).toBe(true);
    // DB should NOT have been re-read for session-0 (cache still intact)
    const getBySessionCalls = (db.messages.getBySessionId as ReturnType<typeof vi.fn>).mock.calls;
    const session0Reads = getBySessionCalls.filter((c: string[]) => c[0] === 'session-0');
    expect(session0Reads).toHaveLength(1); // only the initial getMessages call
  });
});
