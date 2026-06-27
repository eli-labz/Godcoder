import { useCallback, useState } from "react";
import { Segmented, Tooltip } from "antd";
import { MessageCircle, Map, Code, Zap, ArrowUp, Folder } from "lucide-react";
import { useSessionLauncher, folderName } from "@/hooks/useSessionLauncher";
import { dispatchUserMessage } from "@/hooks/useAgentSend";
import VoiceControls from "@/components/agent/VoiceControls/VoiceControls";

type Mode = "ask" | "plan" | "coding" | "freestyle";

const SEG_TO_MODE: Record<string, Mode> = { Ask: "ask", Plan: "plan", Code: "coding", Free: "freestyle" };
const MODE_TO_SEG: Record<Mode, string> = { ask: "Ask", plan: "Plan", coding: "Code", freestyle: "Free" };

const PLACEHOLDER: Record<Mode, string> = {
  ask: "Ask a question about a codebase…",
  plan: "Describe what you want to plan…",
  coding: "Describe what you want to build or change…",
  freestyle: "Describe the task — the agent runs it end-to-end…",
};

/** Interactive empty state: type a first message to spin up a session.
 * Picks a project folder (if none chosen), creates + opens the session in the
 * selected mode, then sends the message — so the right panel doubles as a
 * chat box before any session exists. */
export default function EmptySessionView() {
  const { createInFolder, promptForFolder } = useSessionLauncher();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("coding");
  const [folder, setFolder] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const chooseFolder = useCallback(async () => {
    const f = await promptForFolder();
    if (f) setFolder(f);
  }, [promptForFolder]);

  const submit = useCallback(
    async (explicitText?: string) => {
      const t = (explicitText ?? text).trim();
      if (!t || busy) return;
      setBusy(true);
      try {
        let f = folder;
        if (!f) {
          f = await promptForFolder();
          if (!f) return;
          setFolder(f);
        }
        const session = await createInFolder(f, mode);
        if (!session) return; // creation failed or Freestyle warning cancelled
        await dispatchUserMessage(session.id, t, mode);
        setText("");
      } finally {
        setBusy(false);
      }
    },
    [text, busy, folder, mode, promptForFolder, createInFolder],
  );

  // Dictation fills the box; voice-to-voice sends the first message straight off.
  const handleTranscript = useCallback((t: string) => {
    setText((prev) => (prev.trim() ? `${prev.trimEnd()} ${t}` : t));
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-5">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1">Start a new session</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Type below to begin — pick a project folder and a mode, then send your first message.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border-color-8)] bg-[var(--bg-secondary)] p-3 shadow-sm">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={3}
            autoFocus
            placeholder={PLACEHOLDER[mode]}
            className="w-full resize-none bg-transparent outline-none text-[14px] leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] px-1 py-1"
          />

          <div className="flex items-center gap-2 mt-2">
            <Tooltip title={folder ?? "Choose a project folder"}>
              <button
                type="button"
                onClick={() => chooseFolder()}
                className="flex items-center gap-1.5 max-w-[220px] px-2.5 py-1.5 rounded-lg text-[12px] text-[var(--text-primary)] bg-[var(--white-opacity-4)] hover:bg-[var(--white-opacity-8)] border border-[var(--border-color-8)]"
              >
                <Folder size={13} className="shrink-0" />
                <span className="truncate">{folder ? folderName(folder) : "Choose folder"}</span>
              </button>
            </Tooltip>

            <Segmented
              size="small"
              value={MODE_TO_SEG[mode]}
              options={[
                { label: <span className="flex items-center gap-1"><MessageCircle size={12} />Ask</span>, value: "Ask" },
                { label: <span className="flex items-center gap-1"><Map size={12} />Plan</span>, value: "Plan" },
                { label: <span className="flex items-center gap-1"><Code size={12} />Code</span>, value: "Code" },
                { label: <span className="flex items-center gap-1"><Zap size={12} />Freestyle</span>, value: "Free" },
              ]}
              onChange={(val) => setMode(SEG_TO_MODE[val as string])}
              style={{ fontSize: 12, backgroundColor: "var(--white-opacity-10)" }}
            />

            <div className="ml-auto flex items-center gap-2">
              <VoiceControls onTranscript={handleTranscript} onSend={(t) => submit(t)} />
              <button
                type="button"
                onClick={() => submit()}
                disabled={!text.trim() || busy}
                title="Start session"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowUp size={16} />
              </button>
            </div>
          </div>
        </div>

        {mode === "freestyle" && (
          <p className="text-[11px] text-[var(--text-secondary)] text-center mt-2">
            Freestyle auto-approves every tool call. You'll be asked to confirm the first time.
          </p>
        )}
      </div>
    </div>
  );
}
