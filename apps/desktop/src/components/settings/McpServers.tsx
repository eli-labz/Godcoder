import { useEffect, useState } from "react";
import { Input, Button, Switch, Popconfirm, Tag, Spin, Select } from "antd";
import { Plus, Pencil, Trash2, Plug, CheckCircle2 } from "lucide-react";
import { agentTauriService } from "@/services/agentTauriService";
import { themedMessage } from "@/providers/AntDThemeProvider";
import type { McpServerConfig, McpTransport } from "@/types/agent";

/** Local editable form mirror of an MCP server (args/env/headers as multiline text). */
interface Draft {
  id: string;
  name: string;
  transport: McpTransport;
  command: string;
  argsText: string;
  envText: string;
  url: string;
  headersText: string;
  enabled: boolean;
}

const emptyDraft: Draft = {
  id: "",
  name: "",
  transport: "stdio",
  command: "",
  argsText: "",
  envText: "",
  url: "",
  headersText: "",
  enabled: true,
};

function toDraft(s: McpServerConfig): Draft {
  return {
    id: s.id,
    name: s.name,
    transport: s.transport ?? "stdio",
    command: s.command,
    argsText: (s.args ?? []).join("\n"),
    envText: Object.entries(s.env ?? {})
      .map(([k, v]) => `${k}=${v}`)
      .join("\n"),
    url: s.url ?? "",
    headersText: Object.entries(s.headers ?? {})
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n"),
    enabled: s.enabled,
  };
}

function fromDraft(d: Draft): McpServerConfig {
  const args = d.argsText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const env: Record<string, string> = {};
  for (const line of d.envText.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const idx = t.indexOf("=");
    if (idx > 0) env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
  }
  const headers: Record<string, string> = {};
  for (const line of d.headersText.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const idx = t.search(/[:=]/);
    if (idx > 0) headers[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
  }
  return {
    id: d.id,
    name: d.name.trim(),
    transport: d.transport,
    command: d.command.trim(),
    args,
    env,
    url: d.url.trim(),
    headers,
    enabled: d.enabled,
  };
}

/** One-click presets for popular MCP servers. */
const PRESETS: { name: string; description: string; draft: Partial<Draft> }[] = [
  {
    name: "Filesystem",
    description: "Read/write files in a folder",
    draft: {
      name: "filesystem",
      transport: "stdio",
      command: "npx",
      argsText: "-y\n@modelcontextprotocol/server-filesystem\nC:\\Users\\me\\project",
    },
  },
  {
    name: "GitHub",
    description: "Repos, issues, PRs",
    draft: {
      name: "github",
      transport: "stdio",
      command: "npx",
      argsText: "-y\n@modelcontextprotocol/server-github",
      envText: "GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...",
    },
  },
  {
    name: "Git",
    description: "Local git repository ops",
    draft: {
      name: "git",
      transport: "stdio",
      command: "uvx",
      argsText: "mcp-server-git\n--repository\nC:\\Users\\me\\project",
    },
  },
  {
    name: "Fetch",
    description: "Fetch & convert web pages",
    draft: { name: "fetch", transport: "stdio", command: "uvx", argsText: "mcp-server-fetch" },
  },
  {
    name: "Memory",
    description: "Persistent knowledge graph",
    draft: {
      name: "memory",
      transport: "stdio",
      command: "npx",
      argsText: "-y\n@modelcontextprotocol/server-memory",
    },
  },
  {
    name: "Sequential Thinking",
    description: "Step-by-step reasoning",
    draft: {
      name: "sequential-thinking",
      transport: "stdio",
      command: "npx",
      argsText: "-y\n@modelcontextprotocol/server-sequential-thinking",
    },
  },
  {
    name: "Playwright",
    description: "Browser automation",
    draft: {
      name: "playwright",
      transport: "stdio",
      command: "npx",
      argsText: "-y\n@playwright/mcp@latest",
    },
  },
  {
    name: "Brave Search",
    description: "Web search",
    draft: {
      name: "brave-search",
      transport: "stdio",
      command: "npx",
      argsText: "-y\n@modelcontextprotocol/server-brave-search",
      envText: "BRAVE_API_KEY=...",
    },
  },
  {
    name: "Postgres",
    description: "Query a PostgreSQL DB",
    draft: {
      name: "postgres",
      transport: "stdio",
      command: "npx",
      argsText: "-y\n@modelcontextprotocol/server-postgres\npostgresql://localhost/mydb",
    },
  },
  {
    name: "Remote (HTTP)",
    description: "Streamable HTTP server",
    draft: { name: "remote", transport: "http", url: "https://example.com/mcp" },
  },
  {
    name: "Remote (SSE)",
    description: "Legacy HTTP+SSE server",
    draft: { name: "remote-sse", transport: "sse", url: "https://example.com/sse" },
  },
];

/**
 * Manage MCP (Model Context Protocol) servers. Each enabled stdio server is
 * launched per coding session and its tools are exposed to the agent as
 * `mcp__<server>__<tool>`.
 */
export default function McpServers() {
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testedTools, setTestedTools] = useState<string[] | null>(null);

  const refresh = async () => {
    try {
      setServers(await agentTauriService.listMcpServers());
    } catch (err) {
      console.error("[Settings] listMcpServers failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const startAdd = () => {
    setTestedTools(null);
    setDraft({ ...emptyDraft });
  };
  const startPreset = (d: Partial<Draft>) => {
    setTestedTools(null);
    setDraft({ ...emptyDraft, ...d });
  };
  const startEdit = (s: McpServerConfig) => {
    setTestedTools(null);
    setDraft(toDraft(s));
  };
  const cancel = () => {
    setDraft(null);
    setTestedTools(null);
  };

  const handleTest = async () => {
    if (!draft) return;
    if (!draft.command.trim()) {
      themedMessage.warning("Command is required to test");
      return;
    }
    setTesting(true);
    setTestedTools(null);
    try {
      const res = await agentTauriService.testMcpServer(fromDraft(draft));
      setTestedTools(res.tools);
      themedMessage.success(`Connected — ${res.tools.length} tool${res.tools.length === 1 ? "" : "s"}`);
    } catch (err) {
      themedMessage.error(typeof err === "string" ? err : "Failed to connect to MCP server");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.command.trim()) {
      themedMessage.warning("Name and command are required");
      return;
    }
    setSaving(true);
    try {
      await agentTauriService.saveMcpServer(fromDraft(draft));
      await refresh();
      cancel();
      themedMessage.success("MCP server saved");
    } catch (err) {
      themedMessage.error(typeof err === "string" ? err : "Failed to save MCP server");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await agentTauriService.deleteMcpServer(id);
      await refresh();
      themedMessage.success("MCP server removed");
    } catch (err) {
      themedMessage.error(typeof err === "string" ? err : "Failed to remove server");
    }
  };

  const toggleEnabled = async (s: McpServerConfig, enabled: boolean) => {
    try {
      await agentTauriService.saveMcpServer({ ...s, enabled });
      await refresh();
    } catch {
      themedMessage.error("Failed to update server");
    }
  };

  if (loading) {
    return (
      <div className="py-4">
        <Spin size="small" />
      </div>
    );
  }

  return (
    <div>
      {draft ? (
        <div className="flex flex-col gap-4 border border-[var(--border)] rounded-lg p-5 mb-4">
          <div className="text-sm font-medium text-[var(--text-primary)]">
            {draft.id ? "Edit MCP server" : "Add MCP server"}
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Name</label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. filesystem, github, playwright"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Transport</label>
            <Select
              className="w-full"
              value={draft.transport}
              onChange={(transport) => setDraft({ ...draft, transport })}
              options={[
                { label: "stdio — local process", value: "stdio" },
                { label: "HTTP — streamable (remote)", value: "http" },
                { label: "SSE — legacy HTTP+SSE (remote)", value: "sse" },
              ]}
            />
          </div>

          {draft.transport === "stdio" ? (
            <>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Command</label>
                <Input
                  value={draft.command}
                  onChange={(e) => setDraft({ ...draft, command: e.target.value })}
                  placeholder="e.g. npx  ·  uvx  ·  C:\\path\\to\\server.exe"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Arguments (one per line)
                </label>
                <Input.TextArea
                  value={draft.argsText}
                  onChange={(e) => setDraft({ ...draft, argsText: e.target.value })}
                  autoSize={{ minRows: 2, maxRows: 6 }}
                  placeholder={"-y\n@modelcontextprotocol/server-filesystem\nC:\\Users\\me\\project"}
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Environment variables (KEY=value, one per line)
                </label>
                <Input.TextArea
                  value={draft.envText}
                  onChange={(e) => setDraft({ ...draft, envText: e.target.value })}
                  autoSize={{ minRows: 1, maxRows: 6 }}
                  placeholder={"GITHUB_TOKEN=ghp_..."}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Server URL</label>
                <Input
                  value={draft.url}
                  onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                  placeholder={draft.transport === "sse" ? "https://host/sse" : "https://host/mcp"}
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Headers (Name: value, one per line)
                </label>
                <Input.TextArea
                  value={draft.headersText}
                  onChange={(e) => setDraft({ ...draft, headersText: e.target.value })}
                  autoSize={{ minRows: 1, maxRows: 6 }}
                  placeholder={"Authorization: Bearer ..."}
                />
              </div>
            </>
          )}
          <div className="flex items-center justify-between">
            <div className="text-sm text-[var(--text-primary)]">Enabled</div>
            <Switch
              checked={draft.enabled}
              onChange={(enabled) => setDraft({ ...draft, enabled })}
            />
          </div>

          {testedTools && (
            <div className="border border-[var(--border)] rounded-md p-3">
              <div className="text-xs text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                {testedTools.length} tool{testedTools.length === 1 ? "" : "s"} discovered
              </div>
              <div className="flex flex-wrap gap-1.5">
                {testedTools.map((t) => (
                  <Tag key={t} className="font-mono text-[11px]">
                    {t}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="primary" onClick={handleSave} loading={saving}>
              Save
            </Button>
            <Button icon={<Plug className="w-4 h-4" />} onClick={handleTest} loading={testing}>
              Test connection
            </Button>
            <Button onClick={cancel}>Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 mb-3">
            {servers.length === 0 && (
              <div className="text-sm text-[var(--text-secondary)]">
                No MCP servers configured. Add one to give the agent extra tools.
              </div>
            )}
            {servers.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 border border-[var(--border)] rounded-lg px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {s.name}
                    </span>
                    {!s.enabled && (
                      <span className="text-[10px] text-[var(--text-secondary)]">disabled</span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] truncate font-mono">
                    {s.transport === "stdio" || !s.transport
                      ? [s.command, ...(s.args ?? [])].join(" ")
                      : `${s.transport.toUpperCase()} · ${s.url}`}
                  </div>
                </div>
                <Switch
                  size="small"
                  checked={s.enabled}
                  onChange={(v) => toggleEnabled(s, v)}
                />
                <Button type="text" icon={<Pencil className="w-4 h-4" />} onClick={() => startEdit(s)} />
                <Popconfirm
                  title="Remove this MCP server?"
                  onConfirm={() => handleDelete(s.id)}
                  okText="Remove"
                  cancelText="Cancel"
                >
                  <Button type="text" danger icon={<Trash2 className="w-4 h-4" />} />
                </Popconfirm>
              </div>
            ))}
          </div>
          <Button icon={<Plus className="w-4 h-4" />} onClick={startAdd}>
            Add MCP server
          </Button>
          <div className="mt-4">
            <div className="text-xs text-[var(--text-secondary)] mb-2">Quick add a popular server:</div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => startPreset(p.draft)}
                  title={p.description}
                  className="text-xs px-2.5 py-1 rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)]"
                >
                  + {p.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
