use sysinfo::System;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

pub struct ProcessMonitor {
    tracked_apps: Vec<String>, // e.g., ["StardewValley.exe", "Code.exe"]
    last_seen: Arc<Mutex<HashMap<String, bool>>>,
}

impl ProcessMonitor {
    pub fn new(apps: Vec<String>) -> Self {
        Self {
            tracked_apps: apps,
            last_seen: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn check(&self) -> Vec<ProcessEvent> {
        let sys = System::new_all();
        let mut events = Vec::new();
        let mut last_seen = self.last_seen.lock().unwrap();

        for (_pid, process) in sys.processes() {
            let process_name = process.name().to_string_lossy().to_string();
            for tracked in &self.tracked_apps {
                if process_name == *tracked {
                    let was_running = last_seen.get(tracked).copied().unwrap_or(false);
                    if !was_running {
                        events.push(ProcessEvent::Launched(tracked.clone()));
                    }
                    last_seen.insert(tracked.clone(), true);
                }
            }
        }

        // Detect closes
        for tracked in &self.tracked_apps {
            let is_running = sys.processes().values().any(|p| {
                p.name().to_string_lossy().to_string() == *tracked
            });
            let was_running = last_seen.get(tracked).copied().unwrap_or(false);
            if was_running && !is_running {
                events.push(ProcessEvent::Closed(tracked.clone()));
            }
            last_seen.insert(tracked.clone(), is_running);
        }

        events
    }
}

#[derive(Debug)]
pub enum ProcessEvent {
    Launched(String),
    Closed(String),
}