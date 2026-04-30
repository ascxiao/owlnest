use std::path::Path;
use sysinfo::System;

/// App information with icon data
#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct AppInfo {
    pub name: String,
    pub path: String,
    pub icon: Option<String>, // base64 encoded icon or file path
}

/// Extract icon from an executable file
/// Returns the file path that can be converted to a loadable URL by Tauri's convertFileSrc
pub fn extract_icon_from_exe(exe_path: &str) -> Option<String> {
    let path = Path::new(exe_path);
    
    if !path.exists() {
        return None;
    }

    // Return the canonical path for Tauri to serve
    if let Ok(canonical_path) = path.canonicalize() {
        if let Some(path_str) = canonical_path.to_str() {
            return Some(path_str.to_string());
        }
    }

    None
}

/// Get all installed applications with their icons
pub fn get_all_installed_apps() -> Vec<AppInfo> {
    let mut apps = Vec::new();
    
    #[cfg(target_os = "windows")]
    {
        let system = System::new_all();
        
        // First, get currently running applications and their paths
        for process in system.processes().values() {
            let name = process.name().to_string_lossy().to_string();
            let exe_path = process.exe()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();
            
            if !name.is_empty() && !exe_path.is_empty() {
                let icon = extract_icon_from_exe(&exe_path);
                apps.push(AppInfo {
                    name: name.clone(),
                    path: exe_path.clone(),
                    icon,
                });
            }
        }

        // Remove duplicates by name
        apps.sort_by(|a, b| a.name.cmp(&b.name));
        apps.dedup_by(|a, b| a.name == b.name);
        
        // Add common installed applications
        if let Ok(entries) = std::fs::read_dir(r"C:\Program Files") {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    if let Some(dir_name) = path.file_name().and_then(|n| n.to_str()) {
                        // Look for .exe files in the directory
                        if let Ok(subentries) = std::fs::read_dir(&path) {
                            for subentry in subentries.flatten() {
                                let file_path = subentry.path();
                                if file_path.extension().and_then(|e| e.to_str()) == Some("exe") {
                                    if let Some(file_name) = file_path.file_stem().and_then(|n| n.to_str()) {
                                        let app_name = file_name.to_string();
                                        let exe_path = file_path.to_string_lossy().to_string();
                                        
                                        // Check if app already in list
                                        if !apps.iter().any(|a| a.name == app_name) {
                                            let icon = extract_icon_from_exe(&exe_path);
                                            apps.push(AppInfo {
                                                name: app_name,
                                                path: exe_path,
                                                icon,
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // On non-Windows or if no apps found, return empty
    if apps.is_empty() {
        apps.push(AppInfo {
            name: "Visual Studio Code".to_string(),
            path: "code.exe".to_string(),
            icon: None,
        });
        apps.push(AppInfo {
            name: "Google Chrome".to_string(),
            path: "chrome.exe".to_string(),
            icon: None,
        });
    }

    apps
}

/// Get running applications with their paths and icons
pub fn get_running_apps_with_icons() -> Vec<AppInfo> {
    let system = System::new_all();
    let mut apps = Vec::new();
    let mut seen_names = std::collections::HashSet::new();

    for process in system.processes().values() {
        let name = process.name().to_string_lossy().to_string();
        if !name.is_empty() && !seen_names.contains(&name) {
            seen_names.insert(name.clone());
            
            let exe_path = process.exe()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();
            
            let icon = extract_icon_from_exe(&exe_path);
            
            apps.push(AppInfo {
                name,
                path: exe_path,
                icon,
            });
        }
    }

    apps.sort_by(|a, b| a.name.cmp(&b.name));
    apps
}
