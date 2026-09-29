use ssconverter::{ConverterConfig, convert_sspj_to_ssab_files_cancellable};
use std::path::Path;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};

use tauri::Emitter;
use tauri_plugin_opener::OpenerExt;

// Bounds for the directory scan so a mis-dropped huge or pathological tree
// (e.g. a home folder) cannot run unbounded — without these only the Cancel
// button could stop the walk.
//
// Depth is deliberately unbounded: `WalkDir::max_depth` just stops descending,
// so a depth cap would drop deeply nested projects from a batch silently and
// still report success. The entry and time budgets bound the walk just as
// effectively and do raise `budget_exceeded` when they trip.
const SCAN_MAX_DEPTH: usize = usize::MAX;
const SCAN_MAX_ENTRIES: usize = 500_000;
const SCAN_MAX_MILLIS: u64 = 30_000;

/// Which of the two scan budgets stopped the walk, inferred from how many
/// entries were visited before it gave up.
fn scan_limit_label(visited: usize) -> String {
    if visited >= SCAN_MAX_ENTRIES {
        format!("{} entries", SCAN_MAX_ENTRIES)
    } else {
        format!("{} seconds", SCAN_MAX_MILLIS / 1000)
    }
}

/// The converter announces the directory it is about to write to with this
/// prefix. Taking the path from its own message keeps the naming rule
/// (`<name>/`, or `<name>_emb/` when assets are embedded) where it belongs:
/// `get_ssab_output_directory` is private to `ssconverter`, so recomputing it
/// here would be a second copy that could drift. If the wording ever changes,
/// no directory is captured and the frontend simply offers nothing to reveal.
const OUTPUT_DIR_LOG_PREFIX: &str = "Writing output to: ";

struct CancelState(Arc<AtomicBool>);

#[tauri::command]
fn cancel_conversion(state: tauri::State<CancelState>) {
    state.0.store(true, Ordering::Relaxed);
}

/// Classify a filesystem path so the frontend can tell a `.sspj` project, a
/// plain file and a directory apart by their actual type rather than by
/// guessing from the path string.
///
/// Returns `"sspj"`, `"file"`, `"dir"` or `"missing"`. `.sspj` is matched the
/// same way `ssconverter` matches it, so the GUI and the converter always agree
/// on what counts as a project. Errors other than "not found" are reported as
/// `Err` instead of being collapsed into `"missing"` — an unreadable directory
/// is not a nonexistent one, and the caller needs to say so.
#[tauri::command]
fn path_kind(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    match std::fs::metadata(p) {
        Ok(meta) if meta.is_dir() => Ok("dir".to_string()),
        Ok(_) if p.extension().and_then(|ext| ext.to_str()) == Some("sspj") => {
            Ok("sspj".to_string())
        }
        Ok(_) => Ok("file".to_string()),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok("missing".to_string()),
        Err(err) => Err(format!("Cannot read {}: {}", path, err)),
    }
}

/// Open a folder in the system file manager, showing what is inside it.
///
/// Not `revealItemInDir`: that selects a path *within its parent*, so handed
/// the output folder it opens the folder above it with this one highlighted.
/// It is the backend that opens it, because `openPath` from the frontend needs
/// a scope covering every folder a user can choose, and only for something
/// that is a folder: opening a file would launch it.
#[tauri::command]
fn open_folder(app: tauri::AppHandle, path: String) -> Result<(), String> {
    if !Path::new(&path).is_dir() {
        return Err(format!("Not a folder: {}", path));
    }
    app.opener()
        .open_path(path, None::<&str>)
        .map_err(|err| err.to_string())
}

#[derive(serde::Serialize)]
struct VersionInfo {
    app_version: String,
    converter_version: String,
    // Both emitted formats, because a conversion writes both and a bug report
    // that names only one cannot say which side a Player disagreed with.
    ssab_schema_version: u32,
    ssqb_schema_version: u32,
}

/// A single `.sspj` that failed to convert, reported alongside the successes so
/// one bad file never discards the rest of a batch.
#[derive(serde::Serialize)]
struct ConvertFailure {
    path: String,
    error: String,
}

/// How far a batch has got. Emitted once before the first file and again
/// after each one, so the modal can show a determinate bar instead of a
/// spinner that says nothing about a fifty-project run.
#[derive(Clone, serde::Serialize)]
struct ConvertProgress {
    done: usize,
    total: usize,
}

#[derive(serde::Serialize)]
struct ConvertSummary {
    succeeded: Vec<String>,
    failed: Vec<ConvertFailure>,
    /// Every distinct directory the converter reported writing to, in the
    /// order it reported them. Empty when nothing was written.
    output_dirs: Vec<String>,
    /// Non-fatal problems that make the run incomplete (currently only a
    /// truncated directory scan). Already emitted live as `convert-warning`;
    /// repeated here so the final status can say the batch was not exhaustive.
    warnings: Vec<String>,
}

#[tauri::command]
fn get_versions(app: tauri::AppHandle) -> VersionInfo {
    VersionInfo {
        // Resolved from tauri.conf.json's `version`, which is linked to
        // `../package.json`, so package.json is the single source of truth.
        app_version: app.package_info().version.to_string(),
        converter_version: ssconverter::version_string(),
        ssab_schema_version: ssconverter::ssab_schema_version(),
        ssqb_schema_version: ssconverter::ssqb_schema_version(),
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
        let mut warnings: Vec<String> = vec![];

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

            let visited = visited.load(Ordering::Relaxed);
            let hit_budget = budget_exceeded.load(Ordering::Relaxed);

            let _ = app.emit(
                "convert-log",
                format!(
                    "Scan complete: {} .sspj file(s) found in {} entries.",
                    found.load(Ordering::Relaxed),
                    visited
                ),
            );

            if files_to_convert.is_empty() {
                return Err(if hit_budget {
                    format!(
                        "Directory scan stopped at its limit ({}) after {} entries without finding a .sspj file. Please choose a more specific folder.",
                        scan_limit_label(visited),
                        visited
                    )
                } else {
                    "No .sspj files found in the directory.".to_string()
                });
            }

            if hit_budget {
                // Convert what the walk already found instead of discarding the
                // batch, but be explicit that the listing is incomplete.
                let msg = format!(
                    "Directory scan stopped at its limit ({}) after {} entries; converting the {} .sspj file(s) found so far. Choose a more specific folder to reach the rest.",
                    scan_limit_label(visited),
                    visited,
                    files_to_convert.len()
                );
                let _ = app.emit("convert-warning", msg.clone());
                warnings.push(msg);
            }
        } else {
            return Err("Invalid input path.".into());
        }

        let mut succeeded = vec![];
        let mut failed = vec![];
        let mut output_dirs: Vec<String> = vec![];

        let total = files_to_convert.len();
        let _ = app.emit("convert-progress", ConvertProgress { done: 0, total });

        for (index, file) in files_to_convert.iter().enumerate() {
            if should_stop.load(Ordering::Relaxed) {
                return Err("Conversion cancelled by user.".into());
            }

            let _ = app.emit("convert-log", format!("Converting: {}", file.display()));

            // Owned handle for the progress callback, which outlives this scope
            // only as far as the call below.
            let app_clone = app.clone();
            let reported_dir = std::sync::Mutex::new(None::<String>);
            let result = convert_sspj_to_ssab_files_cancellable(file, &config, &|msg: &str| {
                if let Some(dir) = msg.strip_prefix(OUTPUT_DIR_LOG_PREFIX)
                    && let Ok(mut slot) = reported_dir.lock()
                {
                    *slot = Some(dir.to_string());
                }
                let _ = app_clone.emit("convert-log", msg);
            }, &should_stop);

            match result {
                Ok(()) => {
                    succeeded.push(file.to_string_lossy().into_owned());
                    if let Ok(Some(dir)) = reported_dir.into_inner()
                        && !output_dirs.contains(&dir)
                    {
                        output_dirs.push(dir);
                    }
                }
                Err(err) => {
                    // Cancellation surfaces as an error on the in-flight file;
                    // treat that as cancelling the whole batch rather than as a
                    // per-file failure.
                    if should_stop.load(Ordering::Relaxed) {
                        return Err("Conversion cancelled by user.".into());
                    }
                    // Full path, not just the file name: in a real batch nearly
                    // every project is called `project.sspj`. This is the only
                    // place a failure is logged — the frontend renders the
                    // event rather than re-listing `failed` afterwards.
                    let _ = app.emit(
                        "convert-error",
                        format!("Conversion failed for {}: {}", file.display(), err),
                    );
                    failed.push(ConvertFailure {
                        path: file.to_string_lossy().into_owned(),
                        error: err.to_string(),
                    });
                }
            }

            let _ = app.emit("convert-progress", ConvertProgress { done: index + 1, total });
        }

        Ok(ConvertSummary { succeeded, failed, output_dirs, warnings })
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
            path_kind,
            open_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
