//! Local LLM support via [Ollama](https://ollama.com).
//!
//! Ollama exposes an OpenAI-compatible chat endpoint at `<host>/v1`, so a saved
//! provider with `kind = "ollama"` and `base_url = "http://localhost:11434/v1"`
//! flows through the normal OpenAI client path for inference. This module adds
//! the *management* surface the generic OpenAI-compatible provider lacks:
//!
//! - detect whether Ollama is running (`/api/version`),
//! - list locally-installed models (`/api/tags`),
//! - pull a model from the Ollama library or Hugging Face (`/api/pull`,
//!   streaming progress), and
//! - import a local GGUF file from disk (e.g. the C: drive) by shelling out to
//!   `ollama create` with a generated Modelfile.
//!
//! Progress for the long-running pull/import operations is streamed to the
//! frontend via the `ollama:progress` Tauri event.

use serde::Serialize;
use tauri::{AppHandle, Emitter};

/// Strip a trailing `/v1` (the OpenAI-compat suffix) to recover the Ollama
/// management API root, e.g. `http://localhost:11434/v1` → `http://localhost:11434`.
fn api_root(base_url: &str) -> String {
    let trimmed = base_url.trim().trim_end_matches('/');
    let root = trimmed.strip_suffix("/v1").unwrap_or(trimmed);
    let root = root.trim_end_matches('/');
    if root.is_empty() {
        "http://localhost:11434".to_string()
    } else {
        root.to_string()
    }
}

/// Locate the `ollama` executable. Honours `OLLAMA_BIN`, then the default
/// Windows install location, then falls back to `ollama` on `PATH`.
fn ollama_bin() -> String {
    if let Ok(p) = std::env::var("OLLAMA_BIN") {
        if !p.trim().is_empty() {
            return p;
        }
    }
    #[cfg(windows)]
    {
        if let Ok(local) = std::env::var("LOCALAPPDATA") {
            let p = std::path::Path::new(&local)
                .join("Programs")
                .join("Ollama")
                .join("ollama.exe");
            if p.exists() {
                return p.to_string_lossy().to_string();
            }
        }
    }
    "ollama".to_string()
}

/// Normalise a user-supplied model name to what Ollama accepts: lowercase, with
/// only `[a-z0-9._:/-]`. Other characters collapse to `-`.
fn sanitize_model_name(raw: &str) -> String {
    let mut s: String = raw
        .trim()
        .to_lowercase()
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-' | ':' | '/') {
                c
            } else {
                '-'
            }
        })
        .collect();
    while s.contains("--") {
        s = s.replace("--", "-");
    }
    s.trim_matches('-').to_string()
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OllamaStatus {
    pub running: bool,
    pub version: Option<String>,
}

/// Probe whether an Ollama server answers at `base_url`'s host.
#[tauri::command]
pub async fn ollama_status(base_url: String) -> Result<OllamaStatus, String> {
    let url = format!("{}/api/version", api_root(&base_url));
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;
    match client.get(&url).send().await {
        Ok(resp) if resp.status().is_success() => {
            let v: serde_json::Value = resp.json().await.unwrap_or_default();
            Ok(OllamaStatus {
                running: true,
                version: v
                    .get("version")
                    .and_then(|x| x.as_str())
                    .map(|s| s.to_string()),
            })
        }
        _ => Ok(OllamaStatus {
            running: false,
            version: None,
        }),
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OllamaModel {
    pub name: String,
    pub size: u64,
    pub parameter_size: Option<String>,
    pub family: Option<String>,
}

/// List models installed in the local Ollama store (`/api/tags`).
#[tauri::command]
pub async fn ollama_list_models(base_url: String) -> Result<Vec<OllamaModel>, String> {
    let url = format!("{}/api/tags", api_root(&base_url));
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}. Is Ollama running?"))?;
    if !resp.status().is_success() {
        return Err(format!("Ollama returned {}", resp.status()));
    }
    let v: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Bad response from Ollama: {e}"))?;
    let mut out = Vec::new();
    if let Some(arr) = v.get("models").and_then(|m| m.as_array()) {
        for m in arr {
            let name = m
                .get("name")
                .and_then(|x| x.as_str())
                .unwrap_or("")
                .to_string();
            if name.is_empty() {
                continue;
            }
            let size = m.get("size").and_then(|x| x.as_u64()).unwrap_or(0);
            let details = m.get("details");
            let parameter_size = details
                .and_then(|d| d.get("parameter_size"))
                .and_then(|x| x.as_str())
                .map(|s| s.to_string());
            let family = details
                .and_then(|d| d.get("family"))
                .and_then(|x| x.as_str())
                .map(|s| s.to_string());
            out.push(OllamaModel {
                name,
                size,
                parameter_size,
                family,
            });
        }
    }
    Ok(out)
}

/// Pull a model from the Ollama library or Hugging Face (e.g.
/// `hf.co/TheBloke/...:Q4_K_M`). Streams NDJSON progress from `/api/pull` and
/// re-emits each update as an `ollama:progress` event.
#[tauri::command]
pub async fn ollama_pull(app: AppHandle, base_url: String, model: String) -> Result<(), String> {
    let model = model.trim().to_string();
    if model.is_empty() {
        return Err("Model name is required".to_string());
    }
    let url = format!("{}/api/pull", api_root(&base_url));
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| e.to_string())?;
    let mut resp = client
        .post(&url)
        .json(&serde_json::json!({ "name": model, "stream": true }))
        .send()
        .await
        .map_err(|e| format!("Pull request failed: {e}. Is Ollama running?"))?;
    if !resp.status().is_success() {
        let code = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Ollama pull returned {code}: {}", body.trim()));
    }

    let mut buf: Vec<u8> = Vec::new();
    let mut last_err: Option<String> = None;
    while let Some(chunk) = resp
        .chunk()
        .await
        .map_err(|e| format!("Pull stream error: {e}"))?
    {
        buf.extend_from_slice(&chunk);
        // Emit each complete newline-delimited JSON object.
        while let Some(pos) = buf.iter().position(|&b| b == b'\n') {
            let line: Vec<u8> = buf.drain(..=pos).collect();
            let text = String::from_utf8_lossy(&line);
            let text = text.trim();
            if text.is_empty() {
                continue;
            }
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(text) {
                if let Some(err) = v.get("error").and_then(|e| e.as_str()) {
                    last_err = Some(err.to_string());
                    continue;
                }
                let status = v.get("status").and_then(|s| s.as_str()).unwrap_or("");
                let completed = v.get("completed").and_then(|s| s.as_u64());
                let total = v.get("total").and_then(|s| s.as_u64());
                let _ = app.emit(
                    "ollama:progress",
                    serde_json::json!({
                        "kind": "pull",
                        "model": model,
                        "status": status,
                        "completed": completed,
                        "total": total,
                    }),
                );
            }
        }
    }
    if let Some(e) = last_err {
        return Err(e);
    }
    Ok(())
}

/// Import a local GGUF file (e.g. from the C: drive) into Ollama by generating a
/// one-line Modelfile (`FROM <path>`) and running `ollama create`. Runs the CLI
/// on a blocking thread and streams its output as `ollama:progress` events.
#[tauri::command]
pub async fn ollama_import_gguf(
    app: AppHandle,
    base_url: String,
    name: String,
    path: String,
) -> Result<(), String> {
    let gguf = std::path::PathBuf::from(&path);
    if !gguf.exists() {
        return Err(format!("File not found: {path}"));
    }
    let model = sanitize_model_name(&name);
    if model.is_empty() {
        return Err("A valid model name is required".to_string());
    }
    let root = api_root(&base_url);
    let bin = ollama_bin();
    let app2 = app.clone();
    let model2 = model.clone();

    tokio::task::spawn_blocking(move || -> Result<(), String> {
        use std::io::{BufRead, BufReader, Read};
        use std::process::{Command, Stdio};

        // Generate a temporary Modelfile pointing at the on-disk GGUF.
        let mf = std::env::temp_dir().join(format!("godcoder-modelfile-{}.txt", uuid::Uuid::new_v4()));
        std::fs::write(&mf, format!("FROM {}\n", gguf.display()))
            .map_err(|e| format!("Failed to write Modelfile: {e}"))?;

        let mut child = Command::new(&bin)
            .arg("create")
            .arg(&model2)
            .arg("-f")
            .arg(&mf)
            .env("OLLAMA_HOST", &root)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| {
                format!("Failed to run Ollama ({bin}): {e}. Make sure Ollama is installed and on your PATH.")
            })?;

        // Stream stdout line-by-line as progress. ollama create emits small,
        // discrete status lines so draining stdout fully before reading stderr
        // is safe.
        if let Some(out) = child.stdout.take() {
            for line in BufReader::new(out).lines().map_while(Result::ok) {
                if line.trim().is_empty() {
                    continue;
                }
                let _ = app2.emit(
                    "ollama:progress",
                    serde_json::json!({
                        "kind": "import",
                        "model": model2,
                        "status": line.trim(),
                    }),
                );
            }
        }

        let status = child
            .wait()
            .map_err(|e| format!("ollama create failed: {e}"))?;
        let _ = std::fs::remove_file(&mf);

        if !status.success() {
            let mut errbuf = String::new();
            if let Some(mut err) = child.stderr.take() {
                let _ = err.read_to_string(&mut errbuf);
            }
            return Err(if errbuf.trim().is_empty() {
                "ollama create failed".to_string()
            } else {
                errbuf.trim().to_string()
            });
        }
        Ok(())
    })
    .await
    .map_err(|e| format!("Import task error: {e}"))?
}
