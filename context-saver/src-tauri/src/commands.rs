#[tauri::command]

pub fn save_capture(
    app_name: String,
    where_left_off: String,
    next_step: String,
) -> Result<String, String> {
    eprintln!("================== [SAVE_CAPTURE] CALLED ==================");
    eprintln!("[save_capture] app_name: {}", app_name);
    eprintln!("[save_capture] where_left_off: {}", where_left_off);
    eprintln!("[save_capture] next_step: {}", next_step);
    println!("[save_capture] Saving: app={}, where_left_off={}, next_step={}", app_name, where_left_off, next_step);
    
    eprintln!("[save_capture] About to get DB connection...");
    let conn = crate::db::get_db().map_err(|e| {
        let err_msg = format!("Failed to get DB connection: {}", e);
        println!("[save_capture] Error: {}", err_msg);
        eprintln!("[save_capture] Error: {}", err_msg);
        err_msg
    })?;
    eprintln!("[save_capture] Got DB connection");
    
    let id = uuid::Uuid::new_v4().to_string();
    println!("[save_capture] Generated ID: {}", id);
    eprintln!("[save_capture] Generated ID: {}", id);
    
    eprintln!("[save_capture] Preparing SQL statement...");
    let mut stmt = conn
        .prepare("INSERT INTO capture_notes (id, app_name, where_left_off, next_step) VALUES (?, ?, ?, ?)")
        .map_err(|e| {
            let err_msg = format!("Failed to prepare statement: {}", e);
            println!("[save_capture] Error: {}", err_msg);
            eprintln!("[save_capture] Error: {}", err_msg);
            err_msg
        })?;
    eprintln!("[save_capture] Statement prepared");
    
    eprintln!("[save_capture] Binding parameters...");
    stmt.bind((1, &id[..]))
        .map_err(|e| {
            let err_msg = format!("Failed to bind id: {}", e);
            println!("[save_capture] Error: {}", err_msg);
            eprintln!("[save_capture] Error: {}", err_msg);
            err_msg
        })?;
    eprintln!("[save_capture] Bound id");
    
    stmt.bind((2, &app_name[..]))
        .map_err(|e| {
            let err_msg = format!("Failed to bind app_name: {}", e);
            println!("[save_capture] Error: {}", err_msg);
            eprintln!("[save_capture] Error: {}", err_msg);
            err_msg
        })?;
    eprintln!("[save_capture] Bound app_name");
    
    stmt.bind((3, &where_left_off[..]))
        .map_err(|e| {
            let err_msg = format!("Failed to bind where_left_off: {}", e);
            println!("[save_capture] Error: {}", err_msg);
            eprintln!("[save_capture] Error: {}", err_msg);
            err_msg
        })?;
    eprintln!("[save_capture] Bound where_left_off");
    
    stmt.bind((4, &next_step[..]))
        .map_err(|e| {
            let err_msg = format!("Failed to bind next_step: {}", e);
            println!("[save_capture] Error: {}", err_msg);
            eprintln!("[save_capture] Error: {}", err_msg);
            err_msg
        })?;
    eprintln!("[save_capture] Bound next_step");
    
    eprintln!("[save_capture] About to execute statement...");
    stmt.next().map_err(|e| {
        let err_msg = format!("Failed to execute insert: {}", e);
        println!("[save_capture] Error: {}", err_msg);
        eprintln!("[save_capture] Error: {}", err_msg);
        err_msg
    })?;
    eprintln!("[save_capture] Statement executed successfully");
    
    println!("[save_capture] Successfully saved with ID: {}", id);
    eprintln!("[save_capture] Successfully saved with ID: {}", id);
    eprintln!("================== [SAVE_CAPTURE] SUCCESS ==================");
    Ok(id)
}

#[tauri::command]
pub fn get_latest_capture(app_name: String) -> Result<Option<CaptureNote>, String> {
    let conn = crate::db::get_db().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT where_left_off, next_step, captured_at FROM capture_notes 
                  WHERE app_name = ? ORDER BY captured_at DESC LIMIT 1")
        .map_err(|e| e.to_string())?;
    
    stmt.bind((1, &app_name[..]))
        .map_err(|e| e.to_string())?;
    
    if let Ok(sqlite::State::Row) = stmt.next() {
        Ok(Some(CaptureNote {
            where_left_off: stmt.read::<String, usize>(0)
                .map_err(|e| e.to_string())?,
            next_step: stmt.read::<String, usize>(1)
                .map_err(|e| e.to_string())?,
            captured_at: stmt.read::<String, usize>(2)
                .map_err(|e| e.to_string())?,
        }))
    } else {
        Ok(None)
    }
}

#[derive(serde::Serialize)]
pub struct CaptureNote {
    pub where_left_off: String,
    pub next_step: String,
    pub captured_at: String,
}

#[tauri::command]
pub fn get_all_captures() -> Result<Vec<FullCaptureNote>, String> {
    let conn = crate::db::get_db().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, app_name, where_left_off, next_step, captured_at FROM capture_notes ORDER BY captured_at DESC")
        .map_err(|e| e.to_string())?;
    
    let mut notes = Vec::new();
    while let Ok(sqlite::State::Row) = stmt.next() {
        notes.push(FullCaptureNote {
            id: stmt.read::<String, usize>(0).map_err(|e| e.to_string())?,
            app_name: stmt.read::<String, usize>(1).map_err(|e| e.to_string())?,
            where_left_off: stmt.read::<String, usize>(2).map_err(|e| e.to_string())?,
            next_step: stmt.read::<String, usize>(3).map_err(|e| e.to_string())?,
            captured_at: stmt.read::<String, usize>(4).map_err(|e| e.to_string())?,
        });
    }
    
    Ok(notes)
}

#[tauri::command]
pub fn get_monitored_apps() -> Result<Vec<String>, String> {
    Ok(vec![
        "Stardew Valley.exe".to_string(),
        "Code.exe".to_string(),
        "Photoshop.exe".to_string(),
    ])
}

#[tauri::command]
pub fn get_running_apps() -> Result<Vec<crate::icon::AppInfo>, String> {
    Ok(crate::icon::get_running_apps_with_icons())
}

#[derive(serde::Serialize)]
pub struct FullCaptureNote {
    pub id: String,
    pub app_name: String,
    pub where_left_off: String,
    pub next_step: String,
    pub captured_at: String,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct TrackedApp {
    pub name: String,
    pub path: String,
}

#[tauri::command]
pub fn save_tracked_apps(tracked_apps: Vec<TrackedApp>) -> Result<(), String> {
    let conn = crate::db::get_db().map_err(|e| e.to_string())?;

    // Serialize the tracked apps list as JSON
    let json = serde_json::to_string(&tracked_apps)
        .map_err(|e| format!("Failed to serialize tracked apps: {}", e))?;

    // Delete existing setting
    conn.execute("DELETE FROM app_settings WHERE key = 'tracked_apps'")
        .map_err(|e| e.to_string())?;

    // Insert new setting
    let mut stmt = conn
        .prepare("INSERT INTO app_settings (key, value) VALUES (?, ?)")
        .map_err(|e| e.to_string())?;

    stmt.bind((1, "tracked_apps"))
        .map_err(|e| e.to_string())?;
    stmt.bind((2, &json[..]))
        .map_err(|e| e.to_string())?;

    stmt.next().map_err(|e| e.to_string())?;

    println!("[save_tracked_apps] Successfully saved {} tracked apps", tracked_apps.len());
    Ok(())
}

#[tauri::command]
pub fn load_tracked_apps() -> Result<Vec<TrackedApp>, String> {
    let conn = crate::db::get_db().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT value FROM app_settings WHERE key = 'tracked_apps'")
        .map_err(|e| e.to_string())?;

    if let Ok(sqlite::State::Row) = stmt.next() {
        let json = stmt.read::<String, usize>(0)
            .map_err(|e| e.to_string())?;

        let apps: Vec<TrackedApp> = serde_json::from_str(&json)
            .map_err(|e| format!("Failed to deserialize tracked apps: {}", e))?;

        println!("[load_tracked_apps] Loaded {} tracked apps", apps.len());
        Ok(apps)
    } else {
        println!("[load_tracked_apps] No tracked apps found in database");
        Ok(Vec::new())
    }
}