#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod db;
mod process_monitor;
mod commands;

use process_monitor::{ProcessMonitor, ProcessEvent};
use std::sync::Arc;
use std::time::Duration;
use tauri::Emitter;

fn main() {
    let db_conn = db::get_db().expect("Failed to open DB");
    db::init_db(&db_conn).expect("Failed to init DB");

    // Track these apps (user-configurable later)
    let monitor = Arc::new(ProcessMonitor::new(vec![
        "Stardew Valley.exe".to_string(),
        "Code.exe".to_string(),
        "Photoshop.exe".to_string(),
    ]));

    tauri::Builder::default()
        .setup(move |app| {
            let app_handle = app.handle().clone();
            let monitor_clone = monitor.clone();
            
            // Polling loop
            std::thread::spawn(move || {
                loop {
                    let events = monitor_clone.check();
                    for event in events {
                        match event {
                            ProcessEvent::Closed(app) => {
                                println!("App closed: {}", app);
                                let _ = app_handle.emit("app-closed", serde_json::json!({ "app": app }));
                            }
                            ProcessEvent::Launched(app) => {
                                println!("App launched: {}", app);
                                let _ = app_handle.emit("app-launched", serde_json::json!({ "app": app }));
                            }
                        }
                    }
                    std::thread::sleep(Duration::from_secs(2));
                }
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::save_capture,
            commands::get_latest_capture,
            commands::get_all_captures,
            commands::get_monitored_apps,
            commands::get_running_apps,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}