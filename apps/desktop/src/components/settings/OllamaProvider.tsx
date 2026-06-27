import { useCallback, useEffect, useRef, useState } from "react";
import { Input, Button, Select, Progress, Tag, Tooltip } from "antd";
import { RefreshCw, Download, HardDriveDownload, CheckCircle2, XCircle } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { agentTauriService } from "@/services/agentTauriService";
import { themedMessage } from "@/providers/AntDThemeProvider";
import type { OllamaModel, OllamaProgress, ProviderConfig } from "@/types/agent";

interface Props {
  draft: ProviderConfig;
  setDraft: (p: ProviderConfig) => void;
}

/** Human-readable byte size, e.g. 4_700_000_000 → "4.4 GB". */
function formatSize(bytes: number): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Derive a valid Ollama model name from a GGUF file path. */
function nameFromPath(path: string): string {
  const base = path.split(/[\\/]/).pop() ?? path;
  const stem = base.replace(/\.gguf$/i, "");
  return stem
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Editor body for a local-LLM (Ollama) provider. Detects the running server,
 * lists installed models, and lets the user pull from Hugging Face / the Ollama
 * library or import a GGUF file from the C: drive. Selected models populate
 * `draft.models`, which the parent Settings page saves via the normal provider
 * save path.
 */
export default function OllamaProvider({ draft, setDraft }: Props) {
  const [status, setStatus] = useState<{ running: boolean; version: string | null } | null>(null);
  const [checking, setChecking] = useState(false);
  const [installed, setInstalled] = useState<OllamaModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const [pullName, setPullName] = useState("");
  const [pulling, setPulling] = useState(false);

  const [ggufPath, setGgufPath] = useState("");
  const [importName, setImportName] = useState("");
  const [importing, setImporting] = useState(false);

  const [progress, setProgress] = useState<OllamaProgress | null>(null);
  const baseUrl = draft.baseUrl;
  // Keep latest setter/draft in refs so the stable callbacks below don't churn.
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const setModels = useCallback(
    (models: string[]) => setDraft({ ...draftRef.current, models }),
    [setDraft],
  );

  const refreshStatus = useCallback(async () => {
    setChecking(true);
    try {
      setStatus(await agentTauriService.ollamaStatus(baseUrl));
    } catch {
      setStatus({ running: false, version: null });
    } finally {
      setChecking(false);
    }
  }, [baseUrl]);

  const refreshModels = useCallback(async () => {
    setLoadingModels(true);
    try {
      const list = await agentTauriService.ollamaListModels(baseUrl);
      setInstalled(list);
      // Default the exposed-model set to everything installed on first load.
      if (draftRef.current.models.length === 0 && list.length > 0) {
        setModels(list.map((m) => m.name));
      }
    } catch {
      setInstalled([]);
    } finally {
      setLoadingModels(false);
    }
  }, [baseUrl, setModels]);

  // Probe status + list models when the editor opens.
  useEffect(() => {
    refreshStatus();
    refreshModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live progress for pull/import.
  useEffect(() => {
    let un: UnlistenFn | undefined;
    listen<OllamaProgress>("ollama:progress", (e) => setProgress(e.payload)).then((f) => (un = f));
    return () => un?.();
  }, []);

  const pullPct =
    progress?.kind === "pull" && progress.total && progress.completed != null
      ? Math.min(100, Math.round((progress.completed / progress.total) * 100))
      : null;

  const handlePull = async () => {
    const model = pullName.trim();
    if (!model) {
      themedMessage.warning("Enter a model name to pull");
      return;
    }
    setPulling(true);
    setProgress(null);
    try {
      await agentTauriService.ollamaPull(baseUrl, model);
      themedMessage.success(`Pulled ${model}`);
      setPullName("");
      await refreshModels();
      // Expose the freshly-pulled model.
      const next = Array.from(new Set([...draftRef.current.models, model]));
      setModels(next);
    } catch (err) {
      themedMessage.error(typeof err === "string" ? err : `Failed to pull ${model}`);
    } finally {
      setPulling(false);
      setProgress(null);
    }
  };

  const handlePickGguf = async () => {
    const picked = await openDialog({
      multiple: false,
      directory: false,
      filters: [{ name: "GGUF model", extensions: ["gguf"] }],
    });
    if (typeof picked === "string") {
      setGgufPath(picked);
      if (!importName.trim()) setImportName(nameFromPath(picked));
    }
  };

  const handleImport = async () => {
    if (!ggufPath) {
      themedMessage.warning("Choose a .gguf file first");
      return;
    }
    const name = importName.trim() || nameFromPath(ggufPath);
    setImporting(true);
    setProgress(null);
    try {
      await agentTauriService.ollamaImportGguf(baseUrl, name, ggufPath);
      themedMessage.success(`Imported ${name}`);
      setGgufPath("");
      setImportName("");
      await refreshModels();
      const next = Array.from(new Set([...draftRef.current.models, name]));
      setModels(next);
    } catch (err) {
      themedMessage.error(typeof err === "string" ? err : `Failed to import ${name}`);
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  const busy = pulling || importing;

  return (
    <div className="flex flex-col gap-5">
      {/* Runtime status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status?.running ? (
            <Tag icon={<CheckCircle2 className="inline w-3.5 h-3.5 mr-1" />} color="green">
              Ollama running{status.version ? ` · v${status.version}` : ""}
            </Tag>
          ) : (
            <Tag icon={<XCircle className="inline w-3.5 h-3.5 mr-1" />} color="red">
              Ollama not detected
            </Tag>
          )}
        </div>
        <Button
          size="small"
          icon={<RefreshCw className="w-3.5 h-3.5" />}
          loading={checking}
          onClick={refreshStatus}
        >
          Recheck
        </Button>
      </div>
      {!status?.running && (
        <div className="text-xs text-[var(--text-secondary)] -mt-3 leading-relaxed">
          Install Ollama from{" "}
          <span className="font-mono">ollama.com/download</span> and make sure it's running, then
          recheck. Models run fully on your machine.
        </div>
      )}

      {/* Base URL (advanced) */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">Server URL</label>
        <Input
          value={draft.baseUrl}
          onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
          placeholder="http://localhost:11434/v1"
        />
        <div className="text-[11px] text-[var(--text-secondary)] mt-1">
          Default local Ollama. Keep the <span className="font-mono">/v1</span> suffix.
        </div>
      </div>

      {/* Installed models → exposed model set */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs text-[var(--text-secondary)]">Models to use</label>
          <Button
            size="small"
            type="text"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            loading={loadingModels}
            onClick={refreshModels}
          >
            Refresh
          </Button>
        </div>
        <Select
          mode="tags"
          className="w-full"
          value={draft.models}
          onChange={(models) => setModels(models)}
          placeholder="Select installed models, or pull/import below"
          options={installed.map((m) => ({
            label: (
              <span className="flex items-center justify-between gap-2">
                <span className="truncate">{m.name}</span>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  {[m.parameterSize, formatSize(m.size)].filter(Boolean).join(" · ")}
                </span>
              </span>
            ),
            value: m.name,
          }))}
        />
      </div>

      {/* Pull from Hugging Face / Ollama library */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">
          Download a model (Hugging Face or Ollama library)
        </label>
        <div className="flex gap-2">
          <Input
            value={pullName}
            disabled={busy}
            onChange={(e) => setPullName(e.target.value)}
            onPressEnter={handlePull}
            placeholder="e.g. llama3.2  ·  hf.co/bartowski/Llama-3.2-3B-Instruct-GGUF:Q4_K_M"
          />
          <Tooltip title="Pulls into Ollama on your machine">
            <Button
              type="primary"
              icon={<Download className="w-4 h-4" />}
              loading={pulling}
              disabled={importing}
              onClick={handlePull}
            >
              Pull
            </Button>
          </Tooltip>
        </div>
        <div className="text-[11px] text-[var(--text-secondary)] mt-1">
          For Hugging Face GGUF repos use{" "}
          <span className="font-mono">hf.co/&lt;user&gt;/&lt;repo&gt;:&lt;quant&gt;</span>.
        </div>
      </div>

      {/* Import a local GGUF from disk */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">
          Import a GGUF file from your computer
        </label>
        <div className="flex gap-2 mb-2">
          <Input
            readOnly
            value={ggufPath}
            placeholder="No file selected"
            onClick={handlePickGguf}
          />
          <Button icon={<HardDriveDownload className="w-4 h-4" />} disabled={busy} onClick={handlePickGguf}>
            Choose .gguf
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            value={importName}
            disabled={busy}
            onChange={(e) => setImportName(e.target.value)}
            placeholder="Model name (e.g. my-local-model)"
          />
          <Button
            type="primary"
            loading={importing}
            disabled={pulling || !ggufPath}
            onClick={handleImport}
          >
            Import
          </Button>
        </div>
      </div>

      {/* Progress for the active long-running op */}
      {busy && (
        <div className="border border-[var(--border)] rounded-md p-3">
          <div className="text-xs text-[var(--text-secondary)] mb-1 truncate">
            {progress?.status || (pulling ? "Pulling…" : "Importing…")}
          </div>
          {pullPct != null ? (
            <Progress percent={pullPct} size="small" status="active" />
          ) : (
            <Progress percent={100} size="small" status="active" showInfo={false} />
          )}
        </div>
      )}
    </div>
  );
}
