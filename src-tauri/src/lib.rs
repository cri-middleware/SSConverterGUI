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
// Depth is left unbounded: the entry and time budgets already bound the walk.
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
/// no directory is captured and the frontend simply offers nothing to reveal —
/// which `reports_the_default_output_directory` below catches on a submodule bump.
const OUTPUT_DIR_LOG_PREFIX: &str = "Writing output to: ";

/// Convert one `.sspj`, handing every converter message to `on_log`, and return
/// the directory the converter said it wrote to — `None` if it never said.
fn convert_one<F>(
    file: &Path,
    config: &ConverterConfig,
    on_log: &F,
    should_stop: &AtomicBool,
) -> Result<Option<String>, ssconverter::ConverterError>
where
    F: Fn(&str) + Sync + Send,
{
    let reported_dir = std::sync::Mutex::new(None::<String>);
    convert_sspj_to_ssab_files_cancellable(
        file,
        config,
        &|msg: &str| {
            if let Some(dir) = msg.strip_prefix(OUTPUT_DIR_LOG_PREFIX)
                && let Ok(mut slot) = reported_dir.lock()
            {
                *slot = Some(dir.to_string());
            }
            on_log(msg);
        },
        should_stop,
    )?;
    Ok(reported_dir.into_inner().ok().flatten())
}

struct CancelState(Arc<AtomicBool>);
struct RunningState(Arc<AtomicBool>);

/// Held for the length of a run and released however it ends. The frontend
/// cannot be what prevents a second run: a webview reload forgets the first
/// while it carries on here.
struct RunGuard(Arc<AtomicBool>);

impl Drop for RunGuard {
    fn drop(&mut self) {
        self.0.store(false, Ordering::Relaxed);
    }
}

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
    /// Non-fatal problems that make the run incomplete, such as a truncated
    /// directory scan.
    warnings: Vec<String>,
    /// Stop ended the run at the file in flight. The lists above still hold
    /// every file that ended before it, so what was converted is not lost.
    cancelled: bool,
    /// How many `.sspj` the run set out to convert.
    total: usize,
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
    running: tauri::State<'_, RunningState>,
    input_path: String,
    output_path: Option<String>,
    embedded: bool,
) -> Result<ConvertSummary, String> {
    if running
        .0
        .compare_exchange(false, true, Ordering::Relaxed, Ordering::Relaxed)
        .is_err()
    {
        return Err("A conversion is already running.".into());
    }
    let guard = RunGuard(running.0.clone());

    state.0.store(false, Ordering::Relaxed);
    let should_stop = state.0.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let _guard = guard;
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
            // The walk passes over what it cannot read, so an unreadable folder
            // would otherwise report that it holds no projects.
            std::fs::read_dir(path)
                .map_err(|err| format!("Cannot read {}: {}", path.display(), err))?;

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

            // The walk yields entries in whatever order the filesystem lists
            // them. Sorted, a batch converts, logs and lists its failures in the
            // same order every time, and the order a person would look for them.
            files_to_convert.sort();

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
        let mut cancelled = false;

        let total = files_to_convert.len();
        let _ = app.emit("convert-progress", ConvertProgress { done: 0, total });

        for (index, file) in files_to_convert.iter().enumerate() {
            if should_stop.load(Ordering::Relaxed) {
                cancelled = true;
                break;
            }

            let _ = app.emit("convert-log", format!("Converting: {}", file.display()));

            let result = convert_one(
                file,
                &config,
                &|msg: &str| {
                    let _ = app.emit("convert-log", msg);
                },
                &should_stop,
            );

            match result {
                Ok(reported_dir) => {
                    succeeded.push(file.to_string_lossy().into_owned());
                    if let Some(dir) = reported_dir
                        && !output_dirs.contains(&dir)
                    {
                        output_dirs.push(dir);
                    }
                }
                Err(err) => {
                    // Cancellation surfaces as an error on the in-flight file;
                    // treat that as cancelling the whole batch rather than as a
                    // per-file failure. The files that ended before it are
                    // still reported, so a stopped batch keeps what it did.
                    if should_stop.load(Ordering::Relaxed) {
                        cancelled = true;
                        break;
                    }
                    // Full path: projects in different folders often share a
                    // file name.
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

        Ok(ConvertSummary { succeeded, failed, output_dirs, warnings, cancelled, total })
    })
    .await
    .map_err(|e| format!("Task panicked: {}", e))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(CancelState(Arc::new(AtomicBool::new(false))))
        .manage(RunningState(Arc::new(AtomicBool::new(false))))
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    /// The SDK's own fixture project, from the submodule, so these run against
    /// whichever converter the submodule pins.
    fn fixture() -> PathBuf {
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../SpriteStudio-SDK/tests/overall")
    }

    /// A directory of the test's own under the system temp folder, removed on
    /// drop. Conversions run on a copy of the fixture in one: the default
    /// output lands next to the `.sspj`, which is otherwise inside the
    /// submodule's working tree.
    struct Scratch(PathBuf);

    impl Scratch {
        fn new(name: &str) -> Self {
            let dir = std::env::temp_dir().join(format!(
                "ssconverter-gui-{}-{}",
                std::process::id(),
                name
            ));
            let _ = std::fs::remove_dir_all(&dir);
            std::fs::create_dir_all(&dir).unwrap();
            Scratch(dir)
        }
    }

    impl Drop for Scratch {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    fn copy_dir(from: &Path, to: &Path) {
        std::fs::create_dir_all(to).unwrap();
        for entry in std::fs::read_dir(from).unwrap() {
            let entry = entry.unwrap();
            let dest = to.join(entry.file_name());
            if entry.file_type().unwrap().is_dir() {
                copy_dir(&entry.path(), &dest);
            } else {
                std::fs::copy(entry.path(), dest).unwrap();
            }
        }
    }

    // Reveal Output opens the directory `convert_one` reads out of the
    // converter's log, and `defaultOutputName` in src/utils.ts restates the
    // rule that names it. A submodule bump that rewords the message or changes
    // the rule fails here, rather than in the app, where the button would just
    // stop appearing.
    #[test]
    fn reports_the_default_output_directory() {
        for (embedded, name) in [(false, "overall"), (true, "overall_emb")] {
            let scratch = Scratch::new(name);
            copy_dir(&fixture(), &scratch.0);
            let mut config = ConverterConfig::default();
            config.convert_config.embedded = embedded;

            let reported = convert_one(
                &scratch.0.join("overall.sspj"),
                &config,
                &|_: &str| {},
                &AtomicBool::new(false),
            )
            .expect("the SDK's fixture converts");

            let expected = scratch.0.join(name);
            assert_eq!(reported, Some(expected.display().to_string()));
            assert!(expected.is_dir(), "{} was not written", expected.display());
        }
    }

    // The frontend takes a path for a project only when this says `sspj`, and
    // the converter's scan matches the extension the same way, case and all.
    #[test]
    fn path_kind_tells_a_project_from_any_other_path() {
        let kind = |p: &Path| path_kind(p.to_string_lossy().into_owned()).unwrap();
        assert_eq!(kind(&fixture().join("overall.sspj")), "sspj");
        assert_eq!(kind(&fixture().join("Basic.ssae")), "file");
        assert_eq!(kind(&fixture()), "dir");
        assert_eq!(kind(&fixture().join("no-such.sspj")), "missing");

        let scratch = Scratch::new("upper");
        let upper = scratch.0.join("Project.SSPJ");
        std::fs::write(&upper, "").unwrap();
        assert_eq!(kind(&upper), "file");
    }
}
