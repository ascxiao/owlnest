import { getAppDisplayName, getAppIconElement, AppInfo } from "../utils/appIcons";
import "./Dashboard.css"; // Reuse dashboard styles for bento look
import { useMemo } from "react";

interface Note {
  id: string;
  app_name: string;
  where_left_off: string;
  next_step: string;
  captured_at: string;
  recalled_count: number;
}

interface Props {
  notes: Note[];
  trackedApps: AppInfo[];
  onArchiveNote: (id: string) => void;
}

export default function ArchiveView({ notes, trackedApps }: Props) {
  const appInfoMap = useMemo(() => {
    const m = new Map<string, AppInfo>();
    trackedApps.forEach((app) => m.set(app.name, app));
    return m;
  }, [trackedApps]);
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Archived Notes</h1>
        <p className="dashboard-subtitle">A collection of all your resolved context notes.</p>
      </div>

      {notes.length === 0 ? (
        <div className="empty-state-full">
          <p>No archived notes yet.</p>
        </div>
      ) : (
        <div className="dashboard-grid">
          {notes.map((note) => (
            <div key={note.id} className="dashboard-card">
              <div className="card-header">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                   <div className="quick-app-icon" style={{ width: "24px", height: "24px" }}>
                      {getAppIconElement(appInfoMap.get(note.app_name) || { name: note.app_name, path: "", icon: null })}
                   </div>
                   <h2>{getAppDisplayName(note.app_name)}</h2>
                </div>
                <div className="card-badge">Archived</div>
              </div>
              <div className="card-content">
                <div className="latest-note-section">
                  <label>Where you left off</label>
                  <p>{note.where_left_off}</p>
                </div>
                <div className="latest-note-section" style={{ marginTop: "12px" }}>
                  <label>Next step</label>
                  <p>{note.next_step}</p>
                </div>
              </div>
              <div className="note-meta">
                <span className="time-badge">
                  {new Date(note.captured_at).toLocaleDateString()}
                </span>
                <span className="recall-badge">
                  Recalled {note.recalled_count} times
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
