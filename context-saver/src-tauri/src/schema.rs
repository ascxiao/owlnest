// Example: What we'll store locally
// - app_name: "StardewValley.exe"
// - last_note: "Finished Spring Year 1, about to upgrade tools"
// - timestamp: ISO 8601
// - tags: ["gaming", "progress"]

CREATE TABLE capture_notes (
  id TEXT PRIMARY KEY,
  app_name TEXT NOT NULL,
  where_left_off TEXT NOT NULL,
  next_step TEXT NOT NULL,
  tags TEXT,
  captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  recalled_count INTEGER DEFAULT 0
);

CREATE INDEX idx_app_name ON capture_notes(app_name);
CREATE INDEX idx_captured_at ON capture_notes(captured_at);