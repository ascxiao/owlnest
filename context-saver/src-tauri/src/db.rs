use sqlite::Connection;
use std::path::PathBuf;

pub fn get_db() -> Result<Connection, sqlite::Error> {
    let db_path = PathBuf::from("context_saver.db");
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
    
    eprintln!("[db::init_db] Creating/verifying table...");
    let create_result = conn.execute(r#"
        CREATE TABLE IF NOT EXISTS capture_notes (
            id TEXT PRIMARY KEY,
            app_name TEXT NOT NULL,
            where_left_off TEXT NOT NULL,
            next_step TEXT NOT NULL,
            captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    "#);
    
    match create_result {
        Ok(_) => {
            eprintln!("[db::init_db] Table created/verified successfully");
            println!("[db] Table created/verified successfully");
        }
        Err(e) => {
            eprintln!("[db::init_db] Failed to create table: {:?}", e);
            println!("[db] Failed to create table: {:?}", e);
            return Err(e);
        }
    }
    
    eprintln!("[db::init_db] Database initialization complete");
    println!("[db] Database initialization complete");
    Ok(())
}