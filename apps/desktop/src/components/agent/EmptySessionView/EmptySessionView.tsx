import { useCallback, useState } from "react";
import { Segmented, Tooltip } from "antd";
import { MessageCircle, Map, Code, Zap, Repeat, Users, ArrowUp, Folder } from "lucide-react";
import { useSessionLauncher, folderName } from "@/hooks/useSessionLauncher";
import { dispatchUserMessage } from "@/hooks/useAgentSend";
import { agentTauriService } from "@/services/agentTauriService";
import VoiceControls from "@/components/agent/VoiceControls/VoiceControls";

type Mode = "ask" | "plan" | "coding" | "freestyle" | "harness" | "cowork";

const SEG_TO_MODE: Record<string, Mode> = { Ask: "ask", Plan: "plan", Code: "coding", Free: "freestyle", Harness: "harness", CoWork: "cowork" };
const MODE_TO_SEG: Record<Mode, string> = { ask: "Ask", plan: "Plan", coding: "Code", freestyle: "Free", harness: "Harness", cowork: "CoWork" };

const PLACEHOLDER: Record<Mode, string> = {
  ask: "Ask a question about a codebase…",
  plan: "Describe what you want to plan…",
  coding: "Describe what you want to build or change…",
  freestyle: "Describe the task — the agent runs it end-to-end…",
  harness: "No prompt or folder needed — just press ▶ to start. Or add an optional focus…",
  cowork: "Add a prompt with what you want CoWork to do — or just press ▶ to self-train…",
};

/** Built-in kickoff sent automatically in Harness mode so the user doesn't have
 * to type anything: the agent immediately creates its own sandbox folder, opens
 * it in the file explorer, then builds & self-optimizes its AI Agent Harness in
 * real time via the ResearchSwarm bridge. An optional typed focus is appended. */
const HARNESS_KICKOFF =
  "Build and continuously improve your own AI Agent Harness in real time, starting now. " +
  "FIRST, set up a contained workspace so you don't modify the rest of the repo:\n" +
  "1. Create a dedicated folder `harness-build/` at the repo root (use the bash tool: " +
  "`mkdir -p harness-build`). Put ALL new harness files you author inside it — do not edit " +
  "files elsewhere in the repo except to read references.\n" +
  "2. Open that folder in the system file explorer so I can watch it fill up " +
  "(Windows: `explorer.exe harness-build`; macOS: `open harness-build`; Linux: `xdg-open harness-build`). " +
  "Ignore a non-zero exit code from the explorer command.\n" +
  "3. Inside `harness-build/`, scaffold your harness (e.g. a README, an agent loop, tool defs, and an " +
  "eval/benchmark script).\n" +
  "THEN run the self-optimizing loop using the self-optimizing-harness skill and the ResearchSwarm bridge " +
  "(`py third_party/ResearchSwarm-master/godcoder_harness.py`): route the objective, plan the smallest " +
  "improvement, execute it end-to-end inside `harness-build/`, evaluate with your own checks, log the " +
  "outcome, then optimize and repeat — biasing toward higher-success approaches. Keep iterating " +
  "autonomously and report what the harness learned. Do not wait for me.";

/** Built-in kickoff sent automatically in CoWork mode: the agent creates its own
 * sandbox folder, opens it in the file explorer, then trains itself to operate
 * ("cowork") the Open Cowork desktop app, self-optimizing over time via the
 * ResearchSwarm bridge. An optional typed focus is appended. */
const COWORK_KICKOFF =
  "Train yourself to operate and continuously improve your collaboration with the Open Cowork " +
  "desktop app (at `third_party/open-cowork-main`), starting now. " +
  "FIRST, set up a contained workspace so you don't modify the rest of the repo:\n" +
  "1. Create a dedicated folder `cowork-build/` at the repo root (use the bash tool: " +
  "`mkdir -p cowork-build`). Put ALL new files you author inside it — do not edit files " +
  "elsewhere in the repo (including `third_party/open-cowork-main`) except to read references.\n" +
  "2. Open that folder in the system file explorer so I can watch it fill up " +
  "(Windows: `explorer.exe cowork-build`; macOS: `open cowork-build`; Linux: `xdg-open cowork-build`). " +
  "Ignore a non-zero exit code from the explorer command.\n" +
  "3. Read Open Cowork's `readme.md`, `llms.txt`, and `src/` to learn its Skills and MCP surfaces, " +
  "then inside `cowork-build/` scaffold an integration (a README, an adapter/bridge that drives " +
  "Open Cowork, example task scripts, and an eval/benchmark script that scores a cowork task).\n" +
  "THEN run the self-optimizing loop using the cowork-trainer skill and the ResearchSwarm bridge " +
  "(`py third_party/ResearchSwarm-master/godcoder_harness.py`): route the objective, plan the smallest " +
  "improvement, execute it end-to-end inside `cowork-build/`, evaluate with your own checks, log the " +
  "outcome under a `cowork:`-prefixed tag, then optimize and repeat — biasing toward higher-success " +
  "approaches. For any human-action or hybrid step (clicking, typing, opening apps, sending email, " +
  "e-signing), do NOT hand it off — get an actuation plan with the `act` command and EXECUTE it via " +
  "Open Cowork's computer-use / GUI automation (or OS scripting), verifying each step with a screenshot; " +
  "only defer steps that truly need a physical body. Keep iterating autonomously and report what you " +
  "learned about coworking. Do not wait for me.";

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
      const typed = (explicitText ?? text).trim();
      // Harness and CoWork modes need no prompt: fall back to the built-in
      // kickoff. In Harness a typed line is an optional focus; in CoWork a typed
      // prompt becomes the PRIMARY objective the agent must accomplish (using its
      // self-optimizing + human-action actuation loop), with the kickoff as the
      // operating procedure.
      const t =
        mode === "harness"
          ? typed
            ? `${HARNESS_KICKOFF}\n\nAdditional focus for this run: ${typed}`
            : HARNESS_KICKOFF
          : mode === "cowork"
            ? typed
              ? `Your objective for this CoWork run: ${typed}\n\n` +
                "Accomplish that objective directly — execute any human-action or hybrid step " +
                "(clicking, typing, opening apps, sending email, e-signing) yourself via the `act` " +
                "command and Open Cowork's computer-use / GUI automation, deferring only steps that " +
                "truly need a physical body. Use the operating procedure below to set up your sandbox, " +
                "drive Open Cowork, and self-optimize as you go.\n\n" +
                COWORK_KICKOFF
              : COWORK_KICKOFF
            : typed;
      if (!t || busy) return;
      setBusy(true);
      try {
        let f = folder;
        if (!f) {
          // No folder picker on submit: default to the GodCoder repo for every
          // mode. Users can still pick a different folder via the chip above.
          f = await agentTauriService.defaultHarnessFolder();
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
                { label: <span className="flex items-center gap-1"><Repeat size={12} />Harness</span>, value: "Harness" },
                { label: <span className="flex items-center gap-1"><Users size={12} />CoWork</span>, value: "CoWork" },
              ]}
              onChange={(val) => setMode(SEG_TO_MODE[val as string])}
              style={{ fontSize: 12, backgroundColor: "var(--white-opacity-10)" }}
            />

            <div className="ml-auto flex items-center gap-2">
              <VoiceControls onTranscript={handleTranscript} onSend={(t) => submit(t)} />
              <button
                type="button"
                onClick={() => submit()}
                disabled={(mode !== "harness" && mode !== "cowork" && !text.trim()) || busy}
                title={mode === "harness" ? "Start building the harness" : mode === "cowork" ? "Start training to cowork" : "Start session"}
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
        {mode === "harness" && (
          <p className="text-[11px] text-[var(--text-secondary)] text-center mt-2">
            No prompt or folder needed — just press ▶. The agent targets the GodCoder repo and immediately starts building &amp; self-optimizing its own AI Agent Harness in real time. Every tool call is auto-approved; you'll be asked to confirm the first time.
          </p>
        )}
        {mode === "cowork" && (
          <p className="text-[11px] text-[var(--text-secondary)] text-center mt-2">
            No prompt or folder needed — just press ▶. The agent targets the GodCoder repo and immediately starts training itself to drive &amp; self-optimize against the Open Cowork app in real time. Every tool call is auto-approved; you'll be asked to confirm the first time.
          </p>
        )}
      </div>
    </div>
  );
}
