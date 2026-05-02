#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod db;
mod process_monitor;
mod commands;
mod icon;

use base64::{engine::general_purpose, Engine as _};
use process_monitor::{ProcessMonitor, ProcessEvent};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::Emitter;
use systemicons::get_icon;

#[derive(Serialize, Deserialize, Clone)]
pub struct AppInfo {
    pub name: String,
    pub path: String,
    pub icon: Option<String>,
}

// Temporary storage for modal data
lazy_static::lazy_static! {
    static ref PENDING_CAPTURE_DATA: Mutex<Option<PendingCapture>> = Mutex::new(None);
    static ref PENDING_RECALL_DATA: Mutex<Option<serde_json::Value>> = Mutex::new(None);
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct PendingCapture {
    appName: String,
}

#[tauri::command]
fn get_all_apps() -> Vec<AppInfo> {
    let mut apps = Vec::new();

    for app in icon::get_all_installed_apps() {
        let icon_base64 = match get_icon(&app.path, 32) {
            Ok(buffer) => {
                let base64_str = general_purpose::STANDARD.encode(&buffer);
                Some(format!("data:image/png;base64,{}", base64_str))
            }
            Err(error) => {
                eprintln!("Failed to extract icon for {}: {:?}", app.path, error);
                None
            }
        };

        apps.push(AppInfo {
            name: app.name,
            path: app.path,
            icon: icon_base64,
        });
    }

    apps
}

fn normalize_exe_name(input: &str) -> String {
    let trimmed = input.trim().to_lowercase();
    if trimmed.ends_with(".exe") {
        trimmed
    } else {
        format!("{}.exe", trimmed)
    }
}

fn tracked_apps_from_db() -> Vec<String> {
    match commands::load_tracked_apps() {
        Ok(apps) => apps
            .into_iter()
            .map(|app| {
                let path = app.path.trim();
                if path.is_empty() {
                    normalize_exe_name(&app.name)
                } else {
                    std::path::Path::new(path)
                        .file_name()
                        .and_then(|n| n.to_str())
                        .map(normalize_exe_name)
                        .unwrap_or_else(|| normalize_exe_name(&app.name))
                }
            })
            .collect(),
        Err(err) => {
            eprintln!("Failed to load tracked apps for monitor: {}", err);
            Vec::new()
        }
    }
}

#[tauri::command]
fn create_capture_window(app_handle: tauri::AppHandle, app_name: String) -> Result<(), String> {
    // Store data for the window to retrieve
    let window_id = format!("capture_{}", uuid::Uuid::new_v4());
    {
        let mut data = PENDING_CAPTURE_DATA.lock().unwrap();
        *data = Some(PendingCapture { appName: app_name.clone() });
    }
    
    let window = tauri::WebviewWindowBuilder::new(&app_handle, &window_id, tauri::WebviewUrl::App("index.html".into()))
        .title("Save Note")
        .inner_size(600.0, 400.0)
        .always_on_top(true)
        .build()
        .map_err(|e| format!("Failed to create capture window: {}", e))?;
    
    // Center the window on screen
    if let Ok(monitor) = window.primary_monitor() {
        if let Some(m) = monitor {
            let window_width = 600;
            let window_height = 400;
            let x = (m.size().width as i32 - window_width) / 2 + m.position().x;
            let y = (m.size().height as i32 - window_height) / 2 + m.position().y;
            let _ = window.set_position(tauri::PhysicalPosition { x, y });
        }
    }
    
    Ok(())
}

#[tauri::command]
fn create_recall_window(app_handle: tauri::AppHandle, data: serde_json::Value) -> Result<(), String> {
    // Store data for the window to retrieve
    let window_id = format!("recall_{}", uuid::Uuid::new_v4());
    {
        let mut recall_data = PENDING_RECALL_DATA.lock().unwrap();
        *recall_data = Some(data);
    }
    
    let window = tauri::WebviewWindowBuilder::new(&app_handle, &window_id, tauri::WebviewUrl::App("index.html".into()))
        .title("Note")
        .inner_size(700.0, 500.0)
        .always_on_top(true)
        .build()
        .map_err(|e| format!("Failed to create recall window: {}", e))?;
    
    // Center the window on screen
    if let Ok(monitor) = window.primary_monitor() {
        if let Some(m) = monitor {
            let window_width = 700;
            let window_height = 500;
            let x = (m.size().width as i32 - window_width) / 2 + m.position().x;
            let y = (m.size().height as i32 - window_height) / 2 + m.position().y;
            let _ = window.set_position(tauri::PhysicalPosition { x, y });
        }
    }
    
    Ok(())
}

#[tauri::command]
fn get_pending_capture_data() -> Option<PendingCapture> {
    let mut data = PENDING_CAPTURE_DATA.lock().unwrap();
    let result = data.clone();
    *data = None; // Clear after retrieval
    result
}

#[tauri::command]
fn get_pending_recall_data() -> Option<serde_json::Value> {
    let mut data = PENDING_RECALL_DATA.lock().unwrap();
    let result = data.clone();
    *data = None; // Clear after retrieval
    result
}

fn main() {
    let db_conn = db::get_db().expect("Failed to open DB");
    db::init_db(&db_conn).expect("Failed to init DB");

    // Track apps saved in the database, not a hardcoded list.
    let monitor = Arc::new(ProcessMonitor::new(tracked_apps_from_db()));

    tauri::Builder::default()
        .setup(move |app| {
            let app_handle = app.handle().clone();
            let monitor_clone = monitor.clone();

            // Refresh tracked apps periodically so settings changes take effect without restart.
            let monitor_refresh = monitor.clone();
            std::thread::spawn(move || {
                loop {
                    let apps = tracked_apps_from_db();
                    monitor_refresh.set_tracked_apps(apps);
                    std::thread::sleep(Duration::from_secs(10));
                }
            });
            
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
            get_all_apps,
            commands::save_tracked_apps,
            commands::load_tracked_apps,
            create_capture_window,
            create_recall_window,
            get_pending_capture_data,
            get_pending_recall_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}