// Hide the extra console window on Windows release builds (keep this attribute).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    gui_lib::run()
}
