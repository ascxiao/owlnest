use sqlite::{Connection, State};
use std::path::PathBuf;

pub fn get_db() -> Result<Connection, sqlite::Error> {
    let db_path = tauri::api::path::app_config_dir(/*...*/)
        .unwrap()
        .join("context_saver.db");
    
    Connection::open(db_path)
}

pub fn init_db(conn: &Connection) -> Result<(), sqlite::Error> {
    conn.execute(r#"
        CREATE TABLE IF NOT EXISTS capture_notes (
            id TEXT PRIMARY KEY,
            app_name TEXT NOT NULL,
            where_left_off TEXT NOT NULL,
            next_step TEXT NOT NULL,
            captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    "#)?;
    Ok(())
}