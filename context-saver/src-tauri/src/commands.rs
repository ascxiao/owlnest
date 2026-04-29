#[tauri::command]
pub async fn save_capture(
    app_name: String,
    where_left_off: String,
    next_step: String,
) -> Result<String, String> {
    let conn = crate::db::get_db().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    
    conn.execute(
        "INSERT INTO capture_notes (id, app_name, where_left_off, next_step) 
         VALUES (?, ?, ?, ?)",
        &[&id, &app_name, &where_left_off, &next_step],
    ).map_err(|e| e.to_string())?;
    
    Ok(id)
}

#[tauri::command]
pub async fn get_latest_capture(app_name: String) -> Result<Option<CaptureNote>, String> {
    let conn = crate::db::get_db().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT where_left_off, next_step, captured_at FROM capture_notes 
                  WHERE app_name = ? ORDER BY captured_at DESC LIMIT 1")
        .map_err(|e| e.to_string())?;
    
    let mut rows = stmt.iter().map_err(|e| e.to_string())?;
    
    if let Some(row) = rows.next() {
        let row = row.map_err(|e| e.to_string())?;
        Ok(Some(CaptureNote {
            where_left_off: row.read::<&str>(0).to_string(),
            next_step: row.read::<&str>(1).to_string(),
            captured_at: row.read::<&str>(2).to_string(),
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