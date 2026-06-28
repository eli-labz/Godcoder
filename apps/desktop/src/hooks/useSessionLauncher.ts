import { useCallback } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { App } from "antd";
import { useAppStore } from "@/store";
import { agentTauriService } from "@/services/agentTauriService";
import { themedMessage } from "@/providers/AntDThemeProvider";
import { displayToAgentMessage } from "@/utils/agentMessageAdapter";
import { ensureFreestyleConfirmed } from "@/utils/freestyle";
import type { SessionRow } from "@/types/agent";

export function folderName(path: string): string {
  return path.split("/").filter(Boolean).pop() || path;
}

/** Session create/open flow shared by the sidebar and the empty-state composer.
 * Centralizes the Freestyle full-autonomy confirmation so every entry point
 * that can start a Freestyle session warns the user the first time. */
export function useSessionLauncher() {
  const { modal } = App.useApp();

  const openSession = useCallback(async (s: SessionRow) => {
    const store = useAppStore.getState();
    store.upsertAgentThread({
      id: s.id,
      agent_id: "",
      task_summary: s.title || folderName(s.folder),
      folder_path: s.folder,
      branch: store.agentBranch ?? "main",
      status: s.status === "error" ? "error" : s.status === "active" ? "active" : "completed",
      is_coding_session: s.mode === "coding" || s.mode === "freestyle" || s.mode === "harness" || s.mode === "cowork",
      total_additions: 0,
      total_deletions: 0,
      checkpoints: [],
      selectedDiffTurn: null,
      messages: [],
      created_at: s.created_at,
      updated_at: s.updated_at,
    });
    store.openAgentThread(s.id);
    store.setAgentThreadLoading(s.id, true);
    try {
      const msgs = await agentTauriService.getMessages(s.id);
      store.replaceThreadMessages(s.id, msgs.map(displayToAgentMessage));
    } catch (err) {
      console.error("[useSessionLauncher] Failed to load messages:", err);
    } finally {
      store.setAgentThreadLoading(s.id, false);
    }
  }, []);

  /** Create a session in `folder` and open it. Returns the new session, or null
   * if the user cancels the Freestyle warning or creation fails. */
  const createInFolder = useCallback(
    async (folder: string, mode: string = "coding"): Promise<SessionRow | null> => {
      if ((mode === "freestyle" || mode === "harness" || mode === "cowork") && !(await ensureFreestyleConfirmed(modal))) return null;
      try {
        const session = await agentTauriService.createSession(folder, undefined, mode);
        useAppStore.getState().upsertSession(session);
        await openSession(session);
        return session;
      } catch (err) {
        console.error("[useSessionLauncher] create failed:", err);
        themedMessage.error("Failed to create session");
        return null;
      }
    },
    [openSession, modal],
  );

  /** Prompt for a project folder, optionally rooted at `defaultPath` (e.g. a
   * synced cloud folder). Returns the chosen path, or null if cancelled. */
  const promptForFolder = useCallback(async (defaultPath?: string): Promise<string | null> => {
    const selected = await openDialog({
      directory: true,
      multiple: false,
      title: "Select a project folder",
      defaultPath,
    });
    return (selected as string) || null;
  }, []);

  /** Pick a folder, then create + open a session there. */
  const handleNewSession = useCallback(
    async (mode: string = "coding"): Promise<SessionRow | null> => {
      const folder = await promptForFolder();
      if (!folder) return null;
      return createInFolder(folder, mode);
    },
    [createInFolder, promptForFolder],
  );

  return { openSession, createInFolder, promptForFolder, handleNewSession };
}
