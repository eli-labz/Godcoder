import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tooltip } from "antd";
import { Cloud, HardDrive, FolderOpen } from "lucide-react";
import { agentTauriService } from "@/services/agentTauriService";
import { useSessionLauncher } from "@/hooks/useSessionLauncher";
import type { CloudFolder } from "@/types/agent";

/** "Storage" settings section: lists detected cloud drives (OneDrive / Google
 * Drive / Dropbox) and local drive roots. Picking one opens the folder picker
 * rooted there, creates a session, and jumps to the workspace. */
export default function StorageConnections() {
  const navigate = useNavigate();
  const { createInFolder, promptForFolder } = useSessionLauncher();
  const [cloud, setCloud] = useState<CloudFolder[]>([]);
  const [local, setLocal] = useState<CloudFolder[]>([]);

  useEffect(() => {
    agentTauriService.detectCloudFolders().then(setCloud).catch(() => setCloud([]));
    agentTauriService.listLocalDrives().then(setLocal).catch(() => setLocal([]));
  }, []);

  const browse = useCallback(
    async (path: string) => {
      const folder = await promptForFolder(path);
      if (!folder) return;
      const session = await createInFolder(folder, "coding");
      if (session) navigate("/");
    },
    [promptForFolder, createInFolder, navigate],
  );

  // One entry per cloud provider (the sync client may report several paths).
  const seen = new Set<string>();
  const cloudUnique = cloud.filter((c) => (seen.has(c.provider) ? false : seen.add(c.provider)));

  const rows: { key: string; icon: typeof Cloud; label: string; path: string; sub: string }[] = [
    ...cloudUnique.map((c) => ({ key: c.provider, icon: Cloud, label: c.label, path: c.path, sub: c.path })),
    ...local.map((d) => ({ key: `local-${d.path}`, icon: HardDrive, label: `Local Drive ${d.label}`, path: d.path, sub: d.path })),
  ];

  return (
    <>
      <h2 className="text-base font-semibold text-[var(--text-primary)] mt-8 mb-1">Storage</h2>
      <p className="text-sm text-[var(--text-secondary)] mb-3">
        Start a session from a connected cloud drive or a local drive. Only locations detected on this
        machine are shown — install and sign in to a provider's desktop app to connect it.
      </p>

      {rows.length === 0 ? (
        <div className="text-sm text-[var(--text-secondary)] border border-[var(--border)] rounded-lg p-4 mb-8">
          No cloud or local drives detected.
        </div>
      ) : (
        <div className="flex flex-col gap-2 mb-8">
          {rows.map(({ key, icon: Icon, label, path, sub }) => (
            <div
              key={key}
              className="flex items-center gap-3 border border-[var(--border)] rounded-lg px-4 py-3"
            >
              <Icon className="w-5 h-5 text-[var(--text-secondary)] shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm text-[var(--text-primary)]">{label}</span>
                <span className="text-xs text-[var(--text-secondary)] truncate" title={sub}>
                  {sub}
                </span>
              </div>
              <Tooltip title={`Browse ${label} and start a session`}>
                <button
                  type="button"
                  aria-label={`Browse ${label}`}
                  onClick={() => browse(path)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] text-[var(--text-primary)] bg-[var(--white-opacity-4)] hover:bg-[var(--white-opacity-8)] border border-[var(--border)]"
                >
                  <FolderOpen size={14} />
                  Browse
                </button>
              </Tooltip>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
