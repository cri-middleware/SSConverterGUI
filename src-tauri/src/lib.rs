use ssconverter::{ConverterConfig, convert_sspj_to_ssab_files_cancellable};
use std::path::Path;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};

use tauri::Emitter;

// Bounds for the directory scan so a mis-dropped huge or pathological tree
// (e.g. a home folder) cannot run unbounded — without these only the Cancel
// button could stop the walk.
const SCAN_MAX_DEPTH: usize = 64;
const SCAN_MAX_ENTRIES: usize = 500_000;
const SCAN_MAX_MILLIS: u64 = 30_000;

struct CancelState(Arc<AtomicBool>);

#[tauri::command]
fn cancel_conversion(state: tauri::State<CancelState>) {
    state.0.store(true, Ordering::Relaxed);
}

/// Classify a filesystem path so the frontend can tell a file from a directory
/// by its actual type rather than by guessing from the path string.
#[tauri::command]
fn path_kind(path: String) -> String {
    let p = Path::new(&path);
    if p.is_dir() {
        "dir".to_string()
    } else if p.is_file() {
        "file".to_string()
    } else {
        "missing".to_string()
    }
}

#[derive(serde::Serialize)]
struct VersionInfo {
    app_version: String,
    converter_version: String,
    ssab_schema_version: u32,
}

/// A single `.sspj` that failed to convert, reported alongside the successes so
/// one bad file never discards the rest of a batch.
#[derive(serde::Serialize)]
struct ConvertFailure {
    path: String,
    error: String,
}

#[derive(serde::Serialize)]
struct ConvertSummary {
    succeeded: Vec<String>,
    failed: Vec<ConvertFailure>,
}

#[tauri::command]
fn get_versions(app: tauri::AppHandle) -> VersionInfo {
    VersionInfo {
        // Resolved from tauri.conf.json's `version`, which is linked to
        // `../package.json`, so package.json is the single source of truth.
        app_version: app.package_info().version.to_string(),
        converter_version: ssconverter::version_string(),
        ssab_schema_version: ssconverter::ssab_schema_version(),
    }
}

#[tauri::command]
async fn convert_sspj(
    app: tauri::AppHandle,
    state: tauri::State<'_, CancelState>,
    input_path: String,
    output_path: Option<String>,
    embedded: bool,
) -> Result<ConvertSummary, String> {
    state.0.store(false, Ordering::Relaxed);
    let should_stop = state.0.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let mut config = ConverterConfig::default();
        config.convert_config.embedded = embedded;

        let path = Path::new(&input_path);
        let mut files_to_convert = vec![];

        if path.is_file() {
            files_to_convert.push(path.to_path_buf());
            if let Some(out) = output_path
                && !out.trim().is_empty()
            {
                config.output = Some(std::ffi::OsString::from(out));
            }
        } else if path.is_dir() {
            let _ = app.emit("convert-log", "Scanning directory for .sspj files...");

            let visited = AtomicUsize::new(0);
            let found = AtomicUsize::new(0);
            let budget_exceeded = AtomicBool::new(false);

            files_to_convert = ssconverter::utility::collect_sspj_files_cancellable(
                path, &should_stop, SCAN_MAX_DEPTH, SCAN_MAX_ENTRIES, SCAN_MAX_MILLIS,
                &visited, &found, &budget_exceeded,
            );

            if should_stop.load(Ordering::Relaxed) {
                return Err("Conversion cancelled during directory scan.".into());
            }
            if budget_exceeded.load(Ordering::Relaxed) {
                return Err(format!(
                    "Directory scan stopped after reaching its limit ({} entries or {} seconds). Please choose a more specific folder.",
                    SCAN_MAX_ENTRIES,
                    SCAN_MAX_MILLIS / 1000
                ));
            }
            if files_to_convert.is_empty() {
                return Err("No .sspj files found in the directory.".into());
            }
        } else {
            return Err("Invalid input path.".into());
        }

        let mut succeeded = vec![];
        let mut failed = vec![];

        for file in files_to_convert {
            if should_stop.load(Ordering::Relaxed) {
                return Err("Conversion cancelled by user.".into());
            }

            let app_clone = app.clone();

            let _ = app_clone.emit("convert-log", format!("Converting: {:?}", file.file_name().unwrap_or_default()));

            let result = convert_sspj_to_ssab_files_cancellable(&file, &config, &|msg: &str| {
                let _ = app_clone.emit("convert-log", msg);
            }, &should_stop);

            match result {
                Ok(()) => succeeded.push(file.to_string_lossy().into_owned()),
                Err(err) => {
                    // Cancellation surfaces as an error on the in-flight file;
                    // treat that as cancelling the whole batch rather than as a
                    // per-file failure.
                    if should_stop.load(Ordering::Relaxed) {
                        return Err("Conversion cancelled by user.".into());
                    }
                    let log_msg = format!("Conversion failed for {:?}: {}", file.file_name().unwrap_or_default(), err);
                    let _ = app.emit("convert-log", log_msg);
                    failed.push(ConvertFailure {
                        path: file.to_string_lossy().into_owned(),
                        error: err.to_string(),
                    });
                }
            }
        }

        Ok(ConvertSummary { succeeded, failed })
    })
    .await
    .map_err(|e| format!("Task panicked: {}", e))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(CancelState(Arc::new(AtomicBool::new(false))))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            convert_sspj,
            cancel_conversion,
            get_versions,
            path_kind
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
