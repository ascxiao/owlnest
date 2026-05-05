use std::path::{Path, PathBuf};
use sysinfo::System;
#[cfg(target_os = "windows")]
use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE};
#[cfg(target_os = "windows")]
use winreg::RegKey;

/// App information with icon data
#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct AppInfo {
    pub name: String,
    pub path: String,
    pub icon: Option<String>, // base64 encoded icon or file path
}

fn is_system_app(name: &str, exe_path: &str) -> bool {
    let lower_name = name.to_lowercase();
    let lower_path = exe_path.to_lowercase();

    if lower_path.starts_with(r"c:\windows\")
        || lower_path.starts_with(r"c:\windows")
        || lower_path.starts_with(r"c:\program files\windowsapps\")
        || lower_path.starts_with(r"c:\program files (x86)\windowsapps\")
    {
        return true;
    }

    matches!(
        lower_name.as_str(),
        "applicationframehost.exe"
            | "calculator.exe"
            | "clock.exe"
            | "ctfmon.exe"
            | "dllhost.exe"
            | "explorer.exe"
            | "lockapp.exe"
            | "notepad.exe"
            | "runtimebroker.exe"
            | "searchhost.exe"
            | "settings.exe"
            | "sihost.exe"
            | "smartscreen.exe"
            | "startmenuexperiencehost.exe"
            | "shellhost.exe"
            | "shellinfrastructurehost.exe"
            | "taskhostw.exe"
            | "textinputhost.exe"
            | "winlogon.exe"
            | "widgetservice.exe"
            | "wsappx.exe"
            | "svchost.exe"
    )
}

fn is_background_support_app(name: &str, exe_path: &str) -> bool {
    let lower_name = name.to_lowercase();
    let lower_path = exe_path.to_lowercase();

    let blocked_name_fragments = [
        " helper",
        "helper",
        " updater",
        "updater",
        " update",
        "update",
        " installer",
        "installer",
        " setup",
        "setup",
        " uninst",
        "uninst",
        " uninstall",
        "uninstall",
        " crashpad",
        "crashpad",
        " service",
        "service",
        " agent",
        "agent",
        " runtime",
        "runtime",
        " telemetry",
        "telemetry",
        " launcher",
        "launcher",
    ];

    let blocked_path_fragments = [
        r"\windows\",
        r"\windowsapps\",
        r"\common files\",
        r"\temp\",
        r"\appdata\local\temp\",
        r"\appdata\local\microsoft\windows\",
        r"\appdata\roaming\microsoft\windows\start menu\programs\startup\",
    ];

    blocked_name_fragments
        .iter()
        .any(|fragment| lower_name.contains(fragment))
        || blocked_path_fragments
            .iter()
            .any(|fragment| lower_path.contains(fragment))
}

fn is_user_facing_app(name: &str, exe_path: &str) -> bool {
    !is_system_app(name, exe_path) && !is_background_support_app(name, exe_path)
}

fn add_app_if_valid(apps: &mut Vec<AppInfo>, name: String, exe_path: String) {
    if name.is_empty() || exe_path.is_empty() || !is_user_facing_app(&name, &exe_path) {
        return;
    }

    if apps.iter().any(|app| app.name == name && app.path == exe_path) {
        return;
    }

    let icon = extract_icon_from_exe(&exe_path);
    apps.push(AppInfo { name, path: exe_path, icon });
}

#[cfg(target_os = "windows")]
fn collect_steam_libraries(steam_root: &Path) -> Vec<PathBuf> {
    let mut libs = Vec::new();
    let vdf = steam_root.join("steamapps").join("libraryfolders.vdf");
    if !vdf.exists() {
        return libs;
    }

    if let Ok(contents) = std::fs::read_to_string(&vdf) {
        for line in contents.lines() {
            // crude parse: find quoted path containing ':' (like D:\)
            if let Some(start) = line.find('"') {
                if let Some(end) = line[start + 1..].find('"') {
                    let candidate = &line[start + 1..start + 1 + end];
                    if candidate.contains(':') && (candidate.contains("\\") || candidate.contains('/')) {
                        libs.push(PathBuf::from(candidate.replace("\\\\", "\\")));
                    }
                }
            }
        }
    }

    libs
}

#[cfg(target_os = "windows")]
fn collect_registry_installed_apps(apps: &mut Vec<AppInfo>) {
    // Query standard uninstall registry locations (HKLM and HKCU, both 32/64-bit views via WOW6432Node)
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    let uninstall_paths = vec![
        r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
        r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
    ];

    for base in &[&hklm, &hkcu] {
        for rel in &uninstall_paths {
            if let Ok(key) = base.open_subkey(rel) {
                for sub in key.enum_keys().flatten() {
                    if let Ok(subkey) = key.open_subkey(&sub) {
                        let display_name: Result<String, _> = subkey.get_value("DisplayName");
                        if let Ok(name) = display_name {
                            if name.trim().is_empty() {
                                continue;
                            }

                            // DisplayIcon might be like: "C:\Path\app.exe,0"
                            let display_icon: Result<String, _> = subkey.get_value("DisplayIcon");
                            let mut exe_path = String::new();
                            if let Ok(icon_raw) = display_icon {
                                let icon_trim = icon_raw.trim().trim_matches('"');
                                // split at comma
                                let parts: Vec<&str> = icon_trim.split(',').collect();
                                exe_path = parts.get(0).unwrap_or(&"").to_string();
                            }

                            if exe_path.is_empty() {
                                // try InstallLocation + look for exe inside
                                let install_loc: Result<String, _> = subkey.get_value("InstallLocation");
                                if let Ok(loc) = install_loc {
                                    // try to find exes in that folder
                                    let path = Path::new(&loc);
                                    if path.exists() && path.is_dir() {
                                        collect_executables(path, apps, 3);
                                        // Since we collected the actual executables inside the install dir, 
                                        // we don't need to add the generic empty-path name.
                                        continue;
                                    }
                                }
                            }

                            if !exe_path.is_empty() {
                                add_app_if_valid(apps, name.clone(), exe_path);
                            } else {
                                // If we couldn't get an exe path, still add by name with empty path filtered later
                                add_app_if_valid(apps, name.clone(), String::new());
                            }
                        }
                    }
                }
            }
        }
    }
}

fn collect_executables(root: &Path, apps: &mut Vec<AppInfo>, max_depth: usize) {
    if max_depth == 0 || !root.exists() {
        return;
    }

    let entries = match std::fs::read_dir(root) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_executables(&path, apps, max_depth - 1);
            continue;
        }

        if path.extension().and_then(|e| e.to_str()) != Some("exe") {
            continue;
        }

        if let Some(file_name) = path.file_stem().and_then(|n| n.to_str()) {
            add_app_if_valid(apps, file_name.to_string(), path.to_string_lossy().to_string());
        }
    }
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
        let mut system = System::new();
        system.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
        
        // First, get currently running applications and their paths
        for process in system.processes().values() {
            let name = process.name().to_string_lossy().to_string();
            let exe_path = process.exe()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();
            
            add_app_if_valid(&mut apps, name, exe_path);
        }

        // Remove duplicates by name
        apps.sort_by(|a, b| a.name.cmp(&b.name));
        apps.dedup_by(|a, b| a.name == b.name);

        // Recursively scan common installation directories so non-running apps appear too.
        // Reduced depth from 4 to 1 to significantly improve startup time.
        collect_executables(Path::new(r"C:\Program Files"), &mut apps, 1);
        collect_executables(Path::new(r"C:\Program Files (x86)"), &mut apps, 1);

        // Steam libraries and common creative suites often live outside the top-level install roots.
        // Attempt to parse Steam libraryfolders.vdf to locate game libraries.
        let steam_roots = [
            Path::new(r"C:\Program Files\Steam"),
            Path::new(r"C:\Program Files (x86)\Steam"),
        ];

        for root in &steam_roots {
            if root.exists() {
                // add the default steam install
                collect_executables(root, &mut apps, 3);
                // parse additional libraries if present
                for lib in collect_steam_libraries(root) {
                    collect_executables(&lib.join("steamapps").join("common"), &mut apps, 3);
                }
            }
        }

        collect_executables(Path::new(r"C:\Program Files\Adobe"), &mut apps, 2);
        collect_executables(Path::new(r"C:\Program Files (x86)\Adobe"), &mut apps, 2);
        collect_executables(Path::new(r"C:\Program Files\Microsoft Office"), &mut apps, 2);
        collect_executables(Path::new(r"C:\Program Files\Microsoft Office 15"), &mut apps, 2);
        collect_executables(Path::new(r"C:\Program Files\Microsoft Office\root"), &mut apps, 2);
        collect_executables(Path::new(r"C:\Program Files (x86)\Microsoft Office"), &mut apps, 2);

        // Additionally add programs from the registry Uninstall keys for proper display names
        collect_registry_installed_apps(&mut apps);

        apps.sort_by(|a, b| a.name.cmp(&b.name));
        apps.dedup_by(|a, b| a.name == b.name && a.path == b.path);
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
    let mut system = System::new();
    system.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    let mut apps = Vec::new();
    let mut seen_names = std::collections::HashSet::new();

    for process in system.processes().values() {
        let name = process.name().to_string_lossy().to_string();
        if !name.is_empty() && !seen_names.contains(&name) {
            seen_names.insert(name.clone());
            
            let exe_path = process.exe()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();

            if !is_user_facing_app(&name, &exe_path) {
                continue;
            }
            
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
