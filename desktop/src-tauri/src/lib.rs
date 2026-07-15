use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

// ---------------------------------------------------------------------------
// Sidecar process state
// ---------------------------------------------------------------------------

struct SidecarProcess(Mutex<Option<CommandChild>>);

impl Drop for SidecarProcess {
    fn drop(&mut self) {
        if let Ok(mut guard) = self.0.lock() {
            if let Some(child) = guard.take() {
                let _ = child.kill();
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/// Check whether the bundled lcz-api binary can be resolved.
/// Kept as `check_r_available` so rService.ts needs no changes.
#[tauri::command]
fn check_r_available(app: AppHandle) -> bool {
    app.shell().sidecar("lcz-api").is_ok()
}

/// Start the Python FastAPI sidecar.
/// Accepts `plumber_path` for API compatibility with rService.ts (ignored here).
#[tauri::command]
fn start_r_sidecar(
    state: State<'_, SidecarProcess>,
    app: AppHandle,
    plumber_path: String, // kept for rService.ts compat; not used
    output_dir: String,
) -> Result<(), String> {
    let _ = plumber_path; // suppress unused warning
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if guard.is_some() {
        return Ok(()); // already running
    }
    let (_rx, child) = app
        .shell()
        .sidecar("lcz-api")
        .map_err(|e| format!("lcz-api binary not found: {e}"))?
        .env("LCZ_OUTPUT_DIR", &output_dir)
        .spawn()
        .map_err(|e| format!("Failed to start Python sidecar: {e}"))?;
    *guard = Some(child);
    Ok(())
}

#[tauri::command]
fn stop_r_sidecar(state: State<'_, SidecarProcess>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(child) = guard.take() {
        child.kill().map_err(|e| format!("Failed to kill sidecar: {e}"))?;
    }
    Ok(())
}

/// Return app paths; plumberPath is empty string (compat shim for rService.ts).
#[tauri::command]
fn get_app_paths(app: AppHandle) -> Result<serde_json::Value, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    let output_dir = app
        .path()
        .app_data_dir()
        .map(|p| p.join("lcz_output").to_string_lossy().to_string())
        .unwrap_or_default();

    Ok(serde_json::json!({
        "dataDir":     data_dir,
        "outputDir":   output_dir,
        "plumberPath": "",   // unused by new sidecar; kept for rService.ts shape
    }))
}

#[tauri::command]
async fn write_temp_file(name: String, data: Vec<u8>) -> Result<String, String> {
    let temp_dir = std::env::temp_dir().join("lcz-studio");
    std::fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp dir: {e}"))?;
    let file_path = temp_dir.join(&name);
    std::fs::write(&file_path, &data)
        .map_err(|e| format!("Failed to write temp file: {e}"))?;
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn ensure_output_dir(app: AppHandle) -> Result<String, String> {
    let output_dir = app
        .path()
        .app_data_dir()
        .map(|p| p.join("lcz_output"))
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&output_dir)
        .map_err(|e| format!("Failed to create output dir: {e}"))?;
    Ok(output_dir.to_string_lossy().to_string())
}

// ---------------------------------------------------------------------------
// App entry point
// ---------------------------------------------------------------------------

pub fn run() {
    tauri::Builder::default()
        .manage(SidecarProcess(Mutex::new(None)))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            check_r_available,
            start_r_sidecar,
            stop_r_sidecar,
            get_app_paths,
            write_temp_file,
            ensure_output_dir,
        ])
        .setup(|app| {
            // Ensure output directory exists on startup
            if let Ok(output_dir) = app.path().app_data_dir().map(|p| p.join("lcz_output")) {
                let _ = std::fs::create_dir_all(&output_dir);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
