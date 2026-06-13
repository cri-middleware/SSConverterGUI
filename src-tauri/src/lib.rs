// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::path::Path;
use ssconverter::{ConverterConfig, ConvertConfig, convert_sspj_to_ssab_files};

use tauri::Emitter;

#[tauri::command]
async fn convert_sspj(app: tauri::AppHandle, input_path: String, output_path: Option<String>, embedded: bool) -> Result<String, String> {
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
            files_to_convert = ssconverter::utility::parse_args(&[path.to_path_buf()]);
            if files_to_convert.is_empty() {
                return Err("No .sspj files found in the directory.".into());
            }
        } else {
            return Err("Invalid input path.".into());
        }
        
        let mut success_count = 0;
        let total = files_to_convert.len();
        
        for file in files_to_convert {
            let file_clone = file.clone();
            let app_clone = app.clone();
            
            let _ = app_clone.emit("convert-log", format!("Converting: {:?}", file_clone.file_name().unwrap_or_default()));
            
            let result = convert_sspj_to_ssab_files(&file, &config, &|msg: &str| {
                let _ = app_clone.emit("convert-log", msg);
            });
            
            if result.is_ok() {
                success_count += 1;
            } else {
                let err_msg = format!("Conversion failed for {:?}: {:?}", file, result.err());
                let _ = app.emit("convert-log", err_msg.clone());
                return Err(err_msg);
            }
        }
        
        if total == 1 {
            Ok("Conversion completed successfully".into())
        } else {
            Ok(format!("Successfully converted {}/{} projects", success_count, total))
        }
    })
    .await
    .map_err(|e| format!("Task panicked: {}", e))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![convert_sspj])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
