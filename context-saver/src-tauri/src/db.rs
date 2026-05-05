use sqlite::Connection;
use std::path::PathBuf;

pub fn get_db() -> Result<Connection, sqlite::Error> {
    let db_path = PathBuf::from("owlnest.db");
    eprintln!("[db::get_db] Opening database at: {:?}", db_path);
    println!("[db] Opening database at: {:?}", db_path);
    let result = Connection::open(db_path);
    match &result {
        Ok(_) => {
            eprintln!("[db::get_db] Database opened successfully");
            println!("[db] Database opened successfully");
        }
        Err(e) => {
            eprintln!("[db::get_db] Failed to open database: {:?}", e);
            println!("[db] Failed to open database: {:?}", e);
        }
    }
    result
}

pub fn init_db(conn: &Connection) -> Result<(), sqlite::Error> {
    eprintln!("[db::init_db] Initializing database");
    println!("[db] Initializing database");
    
    eprintln!("[db::init_db] Creating/verifying capture_notes table...");
    let create_result = conn.execute(r#"
        CREATE TABLE IF NOT EXISTS capture_notes (
            id TEXT PRIMARY KEY,
            app_name TEXT NOT NULL,
            where_left_off TEXT NOT NULL,
            next_step TEXT NOT NULL,
            captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            recalled_count INTEGER DEFAULT 0,
            archived INTEGER DEFAULT 0
        )
    "#);
    
    // Migration: gracefully add recalled_count if it doesn't exist
    let _ = conn.execute("ALTER TABLE capture_notes ADD COLUMN recalled_count INTEGER DEFAULT 0");
    let _ = conn.execute("ALTER TABLE capture_notes ADD COLUMN archived INTEGER DEFAULT 0");
    
    match create_result {
        Ok(_) => {
            eprintln!("[db::init_db] capture_notes table created/verified successfully");
            println!("[db] capture_notes table created/verified successfully");
        }
        Err(e) => {
            eprintln!("[db::init_db] Failed to create capture_notes table: {:?}", e);
            println!("[db] Failed to create capture_notes table: {:?}", e);
            return Err(e);
        }
    }

    eprintln!("[db::init_db] Creating/verifying app_settings table...");
    let settings_result = conn.execute(r#"
        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    "#);
    
    match settings_result {
        Ok(_) => {
            eprintln!("[db::init_db] app_settings table created/verified successfully");
            println!("[db] app_settings table created/verified successfully");
        }
        Err(e) => {
            eprintln!("[db::init_db] Failed to create app_settings table: {:?}", e);
            println!("[db] Failed to create app_settings table: {:?}", e);
            return Err(e);
        }
    }
    
    eprintln!("[db::init_db] Database initialization complete");
    println!("[db] Database initialization complete");
    Ok(())
}