import React from "react";
import { formatTimestamp, formatTimestampWithTime } from "../utils/formatTime";
import { getAppDisplayName } from "../utils/appIcons";
import "./AppHistory.css";

interface CaptureNote {
  id: string;
  app_name: string;
  where_left_off: string;
  next_step: string;
  captured_at: string;
  recalled_count: number;
}

interface Props {
  app: string;
  notes: CaptureNote[];
  onArchiveNote: (id: string) => void;
}

export default function AppHistory({ app, notes, onArchiveNote }: Props) {
  if (!app || notes.length === 0) {
    return (
      <div className="app-history">
        <div className="app-history-empty">
          <p>No history available for this app</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-history">
      <div className="app-history-header">
        <h2>{getAppDisplayName(app)}</h2>
        <span className="history-count">{notes.length} notes</span>
      </div>

      <div className="app-history-list">
        {notes
          .sort(
            (a, b) =>
              new Date(b.captured_at).getTime() -
              new Date(a.captured_at).getTime(),
          )
          .map((note) => (
            <div key={note.id} className="history-item">
              <div className="history-item-timestamp">
                <div className="timestamp-relative">
                  {formatTimestamp(note.captured_at)}
                </div>
                <div className="timestamp-absolute">
                  {formatTimestampWithTime(note.captured_at)}
                </div>
              </div>

              <div className="history-item-content">
                <div className="history-section">
                  <label>Left Off</label>
                  <p>{note.where_left_off}</p>
                </div>

                <div className="history-section">
                  <label>Next Step</label>
                  <p>{note.next_step}</p>
                </div>

                <div className="note-actions">
                  <button 
                    className="action-btn"
                    onClick={() => {
                      const text = `Left Off: ${note.where_left_off}\nNext Step: ${note.next_step}`;
                      navigator.clipboard.writeText(text);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Copy
                  </button>
                  <button 
                    className="action-btn"
                    onClick={() => onArchiveNote(note.id)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                    Archive
                  </button>
                </div>
              </div>

              <div className="history-item-meta">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="recall-icon"
                >
                  <path d="M10 2C5.03 2 1 6 1 10s4.03 8 9 8 9-4 9-8-4.03-8-9-8zm0 14c-3.32 0-6-2.68-6-6s2.68-6 6-6 6 2.68 6 6-2.68 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" />
                </svg>
                <span>{note.recalled_count}x</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
