// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::path::Path;
use ssconverter::{ConverterConfig, ConvertConfig, convert_sspj_to_ssab_files_cancellable};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;

use tauri::Emitter;

struct CancelState(Arc<AtomicBool>);

#[tauri::command]
fn cancel_conversion(state: tauri::State<CancelState>) {
    state.0.store(true, Ordering::Relaxed);
}

#[tauri::command]
async fn convert_sspj(
    app: tauri::AppHandle,
    state: tauri::State<'_, CancelState>,
    input_path: String,
    output_path: Option<String>,
    embedded: bool,
) -> Result<Vec<String>, String> {
    state.0.store(false, Ordering::Relaxed);
    let should_stop = state.0.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let mut config = ConverterConfig::default();
        config.convert_config.embedded = embedded;
        
        let path = Path::new(&input_path);
        let mut files_to_convert = vec![];
        
        if path.is_file() {
            files_to_convert.push(path.to_path_buf());
            if let Some(out) = output_path {
                if !out.trim().is_empty() {
                    config.output = Some(std::ffi::OsString::from(out));
                }
            }
        } else if path.is_dir() {
            let _ = app.emit("convert-log", "Scanning directory for .sspj files...");
            
            let visited = AtomicUsize::new(0);
            let found = AtomicUsize::new(0);
            let budget_exceeded = AtomicBool::new(false);
            
            files_to_convert = ssconverter::utility::collect_sspj_files_cancellable(
                path, &should_stop, usize::MAX, usize::MAX, 0, &visited, &found, &budget_exceeded
            );
            
            if should_stop.load(Ordering::Relaxed) {
                return Err("Conversion cancelled during directory scan.".into());
            }
            if files_to_convert.is_empty() {
                return Err("No .sspj files found in the directory.".into());
            }
        } else {
            return Err("Invalid input path.".into());
        }
        
        let mut success_paths = vec![];
        
        for file in files_to_convert {
            if should_stop.load(Ordering::Relaxed) {
                return Err("Conversion cancelled by user.".into());
            }
            
            let file_clone = file.clone();
            let app_clone = app.clone();
            
            let _ = app_clone.emit("convert-log", format!("Converting: {:?}", file_clone.file_name().unwrap_or_default()));
            
            let result = convert_sspj_to_ssab_files_cancellable(&file, &config, &|msg: &str| {
                let _ = app_clone.emit("convert-log", msg);
            }, &should_stop);
            
            if result.is_ok() {
                success_paths.push(file.to_string_lossy().into_owned());
            } else {
                let err_msg = format!("Conversion failed for {:?}: {:?}", file, result.err());
                let _ = app.emit("convert-log", err_msg.clone());
                return Err(err_msg);
            }
        }
        
        Ok(success_paths)
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
        .invoke_handler(tauri::generate_handler![convert_sspj, cancel_conversion])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
