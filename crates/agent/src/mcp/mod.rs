//! Minimal [Model Context Protocol](https://modelcontextprotocol.io) client.
//!
//! Supports the **stdio transport**: a configured MCP server is launched as a
//! child process and spoken to over newline-delimited JSON-RPC 2.0 on its
//! stdin/stdout. The client performs the `initialize` handshake, lists the
//! server's tools (`tools/list`), and invokes them (`tools/call`). Each
//! discovered MCP tool is wrapped in an [`McpTool`] that implements the agent's
//! [`Tool`](crate::tool::Tool) trait, so MCP tools slot directly into the normal
//! tool registry and the LLM can call them like any built-in tool.
//!
//! Tool names are namespaced `mcp__<server>__<tool>` to avoid collisions with
//! built-in tools and across servers.

use std::collections::HashMap;
use std::process::Stdio;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{ChildStdin, ChildStdout, Command};
use tokio::sync::{mpsc, oneshot, Mutex};

use crate::error::ToolError;
use crate::tool::{Tool, ToolContext, ToolResult};

/// Per-request timeout for an MCP JSON-RPC round-trip.
const REQUEST_TIMEOUT: Duration = Duration::from_secs(60);
/// Protocol revision we advertise during `initialize`.
const PROTOCOL_VERSION: &str = "2024-11-05";

/// Wire transport used to reach an MCP server.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum McpTransport {
    /// Local child process over stdio (the default).
    #[default]
    Stdio,
    /// Remote "Streamable HTTP" transport (single endpoint, JSON or SSE replies).
    Http,
    /// Remote legacy HTTP+SSE transport (GET event stream + POST messages).
    Sse,
}

/// Configuration for one MCP server. Persisted by the host (desktop app) and
/// used to launch / connect to the server. `transport` selects which fields
/// apply: `stdio` uses command/args/env; `http`/`sse` use url/headers.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServerConfig {
    /// Stable id (used by the UI to edit/remove). Optional for ad-hoc connects.
    #[serde(default)]
    pub id: String,
    /// Human-readable name; also used to namespace tool names.
    pub name: String,
    /// Transport to use. Defaults to `stdio` for back-compat with older configs.
    #[serde(default)]
    pub transport: McpTransport,
    /// (stdio) Executable to launch (e.g. `npx`, `uvx`, or an absolute path).
    #[serde(default)]
    pub command: String,
    /// (stdio) Arguments passed to the command.
    #[serde(default)]
    pub args: Vec<String>,
    /// (stdio) Extra environment variables for the child process.
    #[serde(default)]
    pub env: HashMap<String, String>,
    /// (http/sse) Server URL.
    #[serde(default)]
    pub url: String,
    /// (http/sse) Extra HTTP headers (e.g. `Authorization`).
    #[serde(default)]
    pub headers: HashMap<String, String>,
    /// Whether this server is active (connected on session start).
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool {
    true
}

/// Build the JSON-RPC `initialize` params we advertise.
fn initialize_params() -> Value {
    json!({
        "protocolVersion": PROTOCOL_VERSION,
        "capabilities": {},
        "clientInfo": { "name": "Godcoder", "version": "0.1.0" },
    })
}

/// Interpret a JSON-RPC message: `Some(Ok(result))` / `Some(Err(msg))` when it
/// is the response for `id`, `None` when it's an unrelated message.
fn match_response(msg: &Value, id: u64) -> Option<Result<Value, String>> {
    if msg.get("id").and_then(|v| v.as_u64()) != Some(id) {
        return None;
    }
    if let Some(err) = msg.get("error") {
        let m = err
            .get("message")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown error");
        return Some(Err(format!("MCP error: {m}")));
    }
    Some(Ok(msg.get("result").cloned().unwrap_or(Value::Null)))
}

/// Parse a `tools/call` result into `(text, is_error)`.
fn parse_call_result(result: Value) -> (String, bool) {
    let is_error = result.get("isError").and_then(|v| v.as_bool()).unwrap_or(false);
    let mut text = String::new();
    if let Some(content) = result.get("content").and_then(|c| c.as_array()) {
        for item in content {
            match item.get("type").and_then(|v| v.as_str()) {
                Some("text") => {
                    if let Some(t) = item.get("text").and_then(|v| v.as_str()) {
                        if !text.is_empty() {
                            text.push('\n');
                        }
                        text.push_str(t);
                    }
                }
                Some(other) => {
                    if !text.is_empty() {
                        text.push('\n');
                    }
                    text.push_str(&format!("[{other} content omitted]"));
                }
                None => {}
            }
        }
    }
    if text.is_empty() {
        text = serde_json::to_string(&result).unwrap_or_default();
    }
    (text, is_error)
}

/// Lowercase a server name to a tool-name-safe namespace segment.
fn ns(name: &str) -> String {
    let s: String = name
        .trim()
        .to_lowercase()
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '_' })
        .collect();
    let s = s.trim_matches('_').to_string();
    if s.is_empty() {
        "mcp".to_string()
    } else {
        s
    }
}

/// Build the child-process command. On Windows, non-absolute commands without an
/// `.exe` suffix (e.g. `npx`, `uvx`, which are `.cmd` shims) are run through
/// `cmd /C` so the shell resolves them.
fn build_command(config: &McpServerConfig) -> Command {
    #[cfg(windows)]
    {
        let c = config.command.to_lowercase();
        let looks_like_exe = c.ends_with(".exe")
            || config.command.contains('/')
            || config.command.contains('\\');
        if !looks_like_exe {
            let mut cmd = Command::new("cmd");
            cmd.arg("/C").arg(&config.command);
            cmd.args(&config.args);
            return cmd;
        }
    }
    let mut cmd = Command::new(&config.command);
    cmd.args(&config.args);
    cmd
}

// ── stdio transport ─────────────────────────────────────────────────────────

struct StdioIo {
    stdin: ChildStdin,
    reader: BufReader<ChildStdout>,
}

/// A live connection to one MCP server over stdio (child process).
struct StdioClient {
    name: String,
    io: Mutex<StdioIo>,
    next_id: AtomicU64,
    // Held to keep the child process alive; `kill_on_drop` reaps it on drop.
    _child: Mutex<tokio::process::Child>,
}

impl StdioClient {
    async fn connect(config: &McpServerConfig) -> Result<Arc<Self>, String> {
        if config.command.trim().is_empty() {
            return Err("A command is required for the stdio transport".to_string());
        }
        let mut cmd = build_command(config);
        for (k, v) in &config.env {
            cmd.env(k, v);
        }
        cmd.stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);
        git_ops::no_window::no_window_tokio(&mut cmd);

        let mut child = cmd.spawn().map_err(|e| {
            format!(
                "Failed to launch MCP server '{}' ({}): {e}",
                config.name, config.command
            )
        })?;

        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| "MCP server stdin unavailable".to_string())?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "MCP server stdout unavailable".to_string())?;

        // Drain stderr in the background so a chatty server can't block on a full
        // pipe; surface lines as debug logs.
        if let Some(stderr) = child.stderr.take() {
            let server = config.name.clone();
            tokio::spawn(async move {
                let mut lines = BufReader::new(stderr).lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    log::debug!("[mcp:{server}] {line}");
                }
            });
        }

        Ok(Arc::new(Self {
            name: config.name.clone(),
            io: Mutex::new(StdioIo {
                stdin,
                reader: BufReader::new(stdout),
            }),
            next_id: AtomicU64::new(1),
            _child: Mutex::new(child),
        }))
    }

    async fn request(&self, method: &str, params: Value) -> Result<Value, String> {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed);
        let payload = json!({ "jsonrpc": "2.0", "id": id, "method": method, "params": params });

        let mut io = self.io.lock().await;
        let line = format!("{}\n", serde_json::to_string(&payload).map_err(|e| e.to_string())?);
        io.stdin
            .write_all(line.as_bytes())
            .await
            .map_err(|e| format!("MCP write failed: {e}"))?;
        io.stdin.flush().await.map_err(|e| format!("MCP flush failed: {e}"))?;

        let read_fut = async {
            loop {
                let mut buf = String::new();
                let n = io
                    .reader
                    .read_line(&mut buf)
                    .await
                    .map_err(|e| format!("MCP read failed: {e}"))?;
                if n == 0 {
                    return Err(format!("MCP server '{}' closed the connection", self.name));
                }
                let trimmed = buf.trim();
                if trimmed.is_empty() {
                    continue;
                }
                let Ok(msg) = serde_json::from_str::<Value>(trimmed) else {
                    continue;
                };
                if let Some(r) = match_response(&msg, id) {
                    return r;
                }
            }
        };

        match tokio::time::timeout(REQUEST_TIMEOUT, read_fut).await {
            Ok(r) => r,
            Err(_) => Err(format!("MCP request '{method}' timed out")),
        }
    }

    async fn notify(&self, method: &str, params: Value) -> Result<(), String> {
        let payload = json!({ "jsonrpc": "2.0", "method": method, "params": params });
        let mut io = self.io.lock().await;
        let line = format!("{}\n", serde_json::to_string(&payload).map_err(|e| e.to_string())?);
        io.stdin
            .write_all(line.as_bytes())
            .await
            .map_err(|e| format!("MCP write failed: {e}"))?;
        io.stdin.flush().await.map_err(|e| format!("MCP flush failed: {e}"))?;
        Ok(())
    }
}

// ── Streamable HTTP transport ───────────────────────────────────────────────

/// Modern single-endpoint transport: each JSON-RPC request is POSTed; the reply
/// is returned inline as `application/json` or as a one-shot SSE stream.
struct HttpClient {
    http: reqwest::Client,
    url: String,
    headers: HashMap<String, String>,
    session_id: Mutex<Option<String>>,
    next_id: AtomicU64,
}

impl HttpClient {
    fn new(config: &McpServerConfig) -> Result<Arc<Self>, String> {
        if config.url.trim().is_empty() {
            return Err("Server URL is required for the HTTP transport".to_string());
        }
        let http = reqwest::Client::builder()
            .build()
            .map_err(|e| format!("HTTP client error: {e}"))?;
        Ok(Arc::new(Self {
            http,
            url: config.url.trim().to_string(),
            headers: config.headers.clone(),
            session_id: Mutex::new(None),
            next_id: AtomicU64::new(1),
        }))
    }

    async fn request(&self, method: &str, params: Value) -> Result<Value, String> {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed);
        let body = json!({ "jsonrpc": "2.0", "id": id, "method": method, "params": params });

        let mut req = self
            .http
            .post(&self.url)
            .header(reqwest::header::ACCEPT, "application/json, text/event-stream")
            .header(reqwest::header::CONTENT_TYPE, "application/json");
        for (k, v) in &self.headers {
            req = req.header(k, v);
        }
        if let Some(sid) = self.session_id.lock().await.clone() {
            req = req.header("Mcp-Session-Id", sid);
        }

        let send = req.json(&body).send();
        let resp = match tokio::time::timeout(REQUEST_TIMEOUT, send).await {
            Ok(r) => r.map_err(|e| format!("HTTP request failed: {e}"))?,
            Err(_) => return Err(format!("MCP request '{method}' timed out")),
        };
        if !resp.status().is_success() {
            return Err(format!("MCP server returned HTTP {}", resp.status()));
        }
        if let Some(sid) = resp
            .headers()
            .get("mcp-session-id")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string())
        {
            *self.session_id.lock().await = Some(sid);
        }
        let is_sse = resp
            .headers()
            .get(reqwest::header::CONTENT_TYPE)
            .and_then(|v| v.to_str().ok())
            .map(|c| c.contains("text/event-stream"))
            .unwrap_or(false);
        let text = resp.text().await.map_err(|e| format!("HTTP read failed: {e}"))?;
        extract_http_response(&text, is_sse, id)
    }

    async fn notify(&self, method: &str, params: Value) -> Result<(), String> {
        let body = json!({ "jsonrpc": "2.0", "method": method, "params": params });
        let mut req = self
            .http
            .post(&self.url)
            .header(reqwest::header::ACCEPT, "application/json, text/event-stream")
            .header(reqwest::header::CONTENT_TYPE, "application/json");
        for (k, v) in &self.headers {
            req = req.header(k, v);
        }
        if let Some(sid) = self.session_id.lock().await.clone() {
            req = req.header("Mcp-Session-Id", sid);
        }
        let _ = req.json(&body).send().await;
        Ok(())
    }
}

/// Scan a Streamable-HTTP reply (`application/json` or SSE) for the response to `id`.
fn extract_http_response(text: &str, is_sse: bool, id: u64) -> Result<Value, String> {
    if is_sse {
        for line in text.lines() {
            let Some(data) = line.strip_prefix("data:") else {
                continue;
            };
            let data = data.trim();
            if data.is_empty() || data == "[DONE]" {
                continue;
            }
            if let Ok(v) = serde_json::from_str::<Value>(data) {
                if let Some(r) = match_response(&v, id) {
                    return r;
                }
            }
        }
        return Err("No matching response in event stream".to_string());
    }
    let v: Value =
        serde_json::from_str(text.trim()).map_err(|e| format!("Bad JSON-RPC response: {e}"))?;
    if let Some(arr) = v.as_array() {
        for m in arr {
            if let Some(r) = match_response(m, id) {
                return r;
            }
        }
        return Err("No matching response in batch".to_string());
    }
    match_response(&v, id).unwrap_or_else(|| Err("Response id mismatch".to_string()))
}

// ── Legacy HTTP + SSE transport ─────────────────────────────────────────────

/// Older two-channel transport: a long-lived GET event stream delivers
/// responses, while requests are POSTed to an `endpoint` URL the server
/// advertises on connect.
struct SseClient {
    http: reqwest::Client,
    endpoint: String,
    headers: HashMap<String, String>,
    next_id: AtomicU64,
    incoming: Mutex<mpsc::UnboundedReceiver<Value>>,
    reader_task: tokio::task::JoinHandle<()>,
}

impl Drop for SseClient {
    fn drop(&mut self) {
        self.reader_task.abort();
    }
}

impl SseClient {
    async fn connect(config: &McpServerConfig) -> Result<Arc<Self>, String> {
        let url = config.url.trim();
        if url.is_empty() {
            return Err("Server URL is required for the SSE transport".to_string());
        }
        let http = reqwest::Client::builder()
            .build()
            .map_err(|e| format!("HTTP client error: {e}"))?;

        let mut req = http.get(url).header(reqwest::header::ACCEPT, "text/event-stream");
        for (k, v) in &config.headers {
            req = req.header(k, v);
        }
        let resp = req.send().await.map_err(|e| format!("SSE connect failed: {e}"))?;
        if !resp.status().is_success() {
            return Err(format!("SSE endpoint returned HTTP {}", resp.status()));
        }

        let (ep_tx, ep_rx) = oneshot::channel::<String>();
        let (msg_tx, msg_rx) = mpsc::unbounded_channel::<Value>();

        let reader_task = tokio::spawn(async move {
            let mut ep_tx = Some(ep_tx);
            let mut buf = String::new();
            let mut stream = resp.bytes_stream();
            while let Some(chunk) = stream.next().await {
                let Ok(chunk) = chunk else { break };
                buf.push_str(&String::from_utf8_lossy(&chunk).replace("\r\n", "\n"));
                while let Some(pos) = buf.find("\n\n") {
                    let event: String = buf.drain(..pos + 2).collect();
                    let mut ev_name = "";
                    let mut data = String::new();
                    for line in event.lines() {
                        if let Some(e) = line.strip_prefix("event:") {
                            ev_name = e.trim();
                        } else if let Some(d) = line.strip_prefix("data:") {
                            if !data.is_empty() {
                                data.push('\n');
                            }
                            data.push_str(d.strip_prefix(' ').unwrap_or(d));
                        }
                    }
                    let data = data.trim().to_string();
                    if ev_name == "endpoint" {
                        if let Some(tx) = ep_tx.take() {
                            let _ = tx.send(data);
                        }
                    } else if !data.is_empty() {
                        if let Ok(v) = serde_json::from_str::<Value>(&data) {
                            let _ = msg_tx.send(v);
                        }
                    }
                }
            }
        });

        let endpoint_path = match tokio::time::timeout(Duration::from_secs(15), ep_rx).await {
            Ok(Ok(p)) => p,
            _ => {
                reader_task.abort();
                return Err("SSE server did not advertise an endpoint".to_string());
            }
        };
        let endpoint = resolve_url(url, &endpoint_path);

        Ok(Arc::new(Self {
            http,
            endpoint,
            headers: config.headers.clone(),
            next_id: AtomicU64::new(1),
            incoming: Mutex::new(msg_rx),
            reader_task,
        }))
    }

    async fn request(&self, method: &str, params: Value) -> Result<Value, String> {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed);
        let body = json!({ "jsonrpc": "2.0", "id": id, "method": method, "params": params });
        self.post(body).await?;

        let read = async {
            let mut rx = self.incoming.lock().await;
            loop {
                match rx.recv().await {
                    Some(v) => {
                        if let Some(r) = match_response(&v, id) {
                            return r;
                        }
                    }
                    None => return Err("SSE stream closed".to_string()),
                }
            }
        };
        match tokio::time::timeout(REQUEST_TIMEOUT, read).await {
            Ok(r) => r,
            Err(_) => Err(format!("MCP request '{method}' timed out")),
        }
    }

    async fn notify(&self, method: &str, params: Value) -> Result<(), String> {
        let body = json!({ "jsonrpc": "2.0", "method": method, "params": params });
        self.post(body).await
    }

    async fn post(&self, body: Value) -> Result<(), String> {
        let mut req = self
            .http
            .post(&self.endpoint)
            .header(reqwest::header::CONTENT_TYPE, "application/json");
        for (k, v) in &self.headers {
            req = req.header(k, v);
        }
        let resp = req
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("SSE POST failed: {e}"))?;
        if !resp.status().is_success() {
            return Err(format!("SSE endpoint returned HTTP {}", resp.status()));
        }
        Ok(())
    }
}

/// Resolve a possibly-relative SSE endpoint against the stream URL's origin.
fn resolve_url(base: &str, path: &str) -> String {
    if path.starts_with("http://") || path.starts_with("https://") {
        return path.to_string();
    }
    let origin = match base.find("://") {
        Some(i) => {
            let after = &base[i + 3..];
            let host_end = after.find('/').map(|j| i + 3 + j).unwrap_or(base.len());
            &base[..host_end]
        }
        None => base,
    };
    if let Some(stripped) = path.strip_prefix('/') {
        format!("{origin}/{stripped}")
    } else {
        format!("{origin}/{path}")
    }
}

// ── Transport-agnostic endpoint ─────────────────────────────────────────────

/// A connected MCP server, regardless of transport. Cheap to clone (`Arc`).
#[derive(Clone)]
enum Endpoint {
    Stdio(Arc<StdioClient>),
    Http(Arc<HttpClient>),
    Sse(Arc<SseClient>),
}

impl Endpoint {
    async fn request(&self, method: &str, params: Value) -> Result<Value, String> {
        match self {
            Endpoint::Stdio(c) => c.request(method, params).await,
            Endpoint::Http(c) => c.request(method, params).await,
            Endpoint::Sse(c) => c.request(method, params).await,
        }
    }

    async fn notify(&self, method: &str, params: Value) -> Result<(), String> {
        match self {
            Endpoint::Stdio(c) => c.notify(method, params).await,
            Endpoint::Http(c) => c.notify(method, params).await,
            Endpoint::Sse(c) => c.notify(method, params).await,
        }
    }

    async fn initialize(&self) -> Result<(), String> {
        self.request("initialize", initialize_params()).await?;
        self.notify("notifications/initialized", json!({})).await?;
        Ok(())
    }

    async fn list_tools(&self) -> Result<Vec<McpToolDef>, String> {
        let result = self.request("tools/list", json!({})).await?;
        let mut out = Vec::new();
        if let Some(arr) = result.get("tools").and_then(|t| t.as_array()) {
            for t in arr {
                let Some(name) = t.get("name").and_then(|v| v.as_str()) else {
                    continue;
                };
                out.push(McpToolDef {
                    name: name.to_string(),
                    description: t
                        .get("description")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    input_schema: t
                        .get("inputSchema")
                        .cloned()
                        .unwrap_or_else(|| json!({ "type": "object" })),
                });
            }
        }
        Ok(out)
    }

    async fn call_tool(&self, tool: &str, arguments: Value) -> Result<(String, bool), String> {
        let result = self
            .request("tools/call", json!({ "name": tool, "arguments": arguments }))
            .await?;
        Ok(parse_call_result(result))
    }
}

/// A tool advertised by an MCP server.
#[derive(Debug, Clone)]
pub struct McpToolDef {
    pub name: String,
    pub description: String,
    pub input_schema: Value,
}

/// An [`McpToolDef`] bound to its transport endpoint, implementing the agent `Tool` trait.
pub struct McpTool {
    endpoint: Endpoint,
    /// Server-native tool name (used in `tools/call`).
    tool_name: String,
    /// Namespaced name exposed to the LLM: `mcp__<server>__<tool>`.
    full_name: String,
    description: String,
    schema: Value,
}

#[async_trait]
impl Tool for McpTool {
    fn name(&self) -> &str {
        &self.full_name
    }

    fn description(&self) -> &str {
        &self.description
    }

    fn parameters_schema(&self) -> Value {
        self.schema.clone()
    }

    async fn execute(&self, args: Value, ctx: &ToolContext) -> Result<ToolResult, ToolError> {
        let call = self.endpoint.call_tool(&self.tool_name, args);
        tokio::select! {
            res = call => match res {
                Ok((output, is_error)) => Ok(ToolResult {
                    output,
                    is_error,
                    yield_data: None,
                    modified_files: Vec::new(),
                }),
                Err(e) => Ok(ToolResult::error(e)),
            },
            _ = ctx.cancel_token.cancelled() => {
                Ok(ToolResult::error("MCP tool call cancelled"))
            }
        }
    }
}

/// Result of connecting to a single MCP server.
pub struct McpConnection {
    pub tools: Vec<Arc<dyn Tool>>,
    pub tool_names: Vec<String>,
}

/// Connect to one server (any transport), returning its wrapped tools. The
/// returned `Arc<dyn Tool>`s each hold the transport endpoint, keeping the
/// connection (and any child process) alive for as long as the tools live.
pub async fn connect_server(config: &McpServerConfig) -> Result<McpConnection, String> {
    let endpoint = match config.transport {
        McpTransport::Stdio => Endpoint::Stdio(StdioClient::connect(config).await?),
        McpTransport::Http => Endpoint::Http(HttpClient::new(config)?),
        McpTransport::Sse => Endpoint::Sse(SseClient::connect(config).await?),
    };
    endpoint.initialize().await?;
    let defs = endpoint.list_tools().await?;
    let server_ns = ns(&config.name);
    let mut tools: Vec<Arc<dyn Tool>> = Vec::new();
    let mut tool_names = Vec::new();
    for def in defs {
        let full_name = format!("mcp__{}__{}", server_ns, def.name);
        tool_names.push(full_name.clone());
        tools.push(Arc::new(McpTool {
            endpoint: endpoint.clone(),
            tool_name: def.name,
            full_name,
            description: def.description,
            schema: def.input_schema,
        }));
    }
    Ok(McpConnection { tools, tool_names })
}

/// Connect to every enabled server, collecting all tools. Connection failures
/// are logged and skipped so one bad server can't break a session.
pub async fn connect_enabled(configs: &[McpServerConfig]) -> Vec<Arc<dyn Tool>> {
    let mut all: Vec<Arc<dyn Tool>> = Vec::new();
    for cfg in configs.iter().filter(|c| c.enabled) {
        match connect_server(cfg).await {
            Ok(conn) => {
                log::info!(
                    "[mcp] connected '{}' — {} tool(s)",
                    cfg.name,
                    conn.tools.len()
                );
                all.extend(conn.tools);
            }
            Err(e) => log::warn!("[mcp] '{}' failed: {e}", cfg.name),
        }
    }
    all
}
