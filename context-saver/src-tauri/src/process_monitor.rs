use sysinfo::System;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

pub struct ProcessMonitor {
    tracked_apps: Arc<Mutex<Vec<String>>>, // normalized executable basenames like "acrobat.exe"
    last_seen: Arc<Mutex<HashMap<String, bool>>>,
    missing_counts: Arc<Mutex<HashMap<String, u8>>>,
}

impl ProcessMonitor {
    pub fn new(apps: Vec<String>) -> Self {
        Self {
            tracked_apps: Arc::new(Mutex::new(
                apps.into_iter().map(|s| normalize_process_name(&s)).collect(),
            )),
            last_seen: Arc::new(Mutex::new(HashMap::new())),
            missing_counts: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn set_tracked_apps(&self, apps: Vec<String>) {
        if let Ok(mut tracked) = self.tracked_apps.lock() {
            *tracked = apps.into_iter().map(|s| normalize_process_name(&s)).collect();
        }
    }

    fn is_tracked(&self, process_name: &str) -> Option<String> {
        let normalized = normalize_process_name(process_name);
        let tracked = self.tracked_apps.lock().ok()?;
        for tracked_name in tracked.iter() {
            if normalized == *tracked_name {
                return Some(tracked_name.clone());
            }
        }
        None
    }

    pub fn check(&self) -> Vec<ProcessEvent> {
        let sys = System::new_all();
        let mut events = Vec::new();
        let mut last_seen = self.last_seen.lock().unwrap();
        let mut missing_counts = self.missing_counts.lock().unwrap();
        const MISSING_CLOSE_THRESHOLD: u8 = 2;

        for (_pid, process) in sys.processes() {
            let process_name = process.name().to_string_lossy().to_string();
            if let Some(tracked) = self.is_tracked(&process_name) {
                let was_running = last_seen.get(&tracked).copied().unwrap_or(false);
                if !was_running {
                    events.push(ProcessEvent::Launched(tracked.clone()));
                }
                last_seen.insert(tracked.clone(), true);
                missing_counts.insert(tracked, 0);
            }
        }

        // Detect closes
        let tracked_apps = match self.tracked_apps.lock() {
            Ok(locked) => locked.clone(),
            Err(_) => Vec::new(),
        };

        for tracked in &tracked_apps {
            let is_running = sys.processes().values().any(|p| {
                normalize_process_name(&p.name().to_string_lossy()) == *tracked
            });
            let was_running = last_seen.get(tracked).copied().unwrap_or(false);
            if was_running && !is_running {
                let count = missing_counts.get(tracked).copied().unwrap_or(0).saturating_add(1);
                missing_counts.insert(tracked.clone(), count);
                if count >= MISSING_CLOSE_THRESHOLD {
                    events.push(ProcessEvent::Closed(tracked.clone()));
                    last_seen.insert(tracked.clone(), false);
                    missing_counts.insert(tracked.clone(), 0);
                }
            } else {
                missing_counts.insert(tracked.clone(), 0);
            }
            if is_running {
                last_seen.insert(tracked.clone(), true);
            }
        }

        events
    }
}

#[derive(Debug)]
pub enum ProcessEvent {
    Launched(String),
    Closed(String),
}

fn normalize_process_name(name: &str) -> String {
    let lowered = name.trim().to_lowercase();
    if lowered.ends_with(".exe") {
        lowered
    } else {
        format!("{}.exe", lowered)
    }
}