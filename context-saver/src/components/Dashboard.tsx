import React from "react";
import "./Dashboard.css";

interface CaptureNote {
  id: string;
  app_name: string;
  where_left_off: string;
  next_step: string;
  captured_at: string;
  recalled_count: number;
}

interface Props {
  notes: CaptureNote[];
  monitoredApps: string[];
}

export default function Dashboard({ notes, monitoredApps }: Props) {
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    const mins = Math.floor(diff / (1000 * 60));
    return mins > 0 ? `${mins}m ago` : "Just now";
  };

  // Group notes by app
  const notesByApp = notes.reduce(
    (acc, note) => {
      if (!acc[note.app_name]) {
        acc[note.app_name] = [];
      }
      acc[note.app_name].push(note);
      return acc;
    },
    {} as Record<string, CaptureNote[]>,
  );

  // Get latest note for each app
  const latestNotesByApp = Object.entries(notesByApp).reduce(
    (acc, [app, appNotes]) => {
      acc[app] = appNotes.sort(
        (a, b) =>
          new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime(),
      )[0];
      return acc;
    },
    {} as Record<string, CaptureNote>,
  );

  const getAppIcon = (appName: string) => {
    const name = appName.toLowerCase();
    if (name.includes("code")) return "💻";
    if (name.includes("stardew")) return "🎮";
    if (name.includes("photoshop")) return "🎨";
    if (name.includes("figma")) return "🖌️";
    if (name.includes("blender")) return "🎬";
    if (name.includes("vscode")) return "💻";
    if (name.includes("chrome")) return "🌐";
    if (name.includes("firefox")) return "🌐";
    return "📱";
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Context Saver</h1>
        <p className="subtitle">Your mental context, preserved</p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-number">{monitoredApps.length}</div>
          <div className="stat-label">Apps Monitored</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{notes.length}</div>
          <div className="stat-label">Notes Captured</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {notes.reduce((sum, note) => sum + note.recalled_count, 0)}
          </div>
          <div className="stat-label">Times Recalled</div>
        </div>
      </div>

      <div className="apps-section">
        <h2>Active Applications</h2>

        {monitoredApps.length === 0 ? (
          <div className="empty-state">
            <p>No applications being monitored yet.</p>
          </div>
        ) : (
          <div className="apps-grid">
            {monitoredApps.map((app) => {
              const latestNote = latestNotesByApp[app];
              const appNoteCount = notesByApp[app]?.length || 0;

              return (
                <div key={app} className="app-card">
                  <div className="app-card-header">
                    <div className="app-icon">{getAppIcon(app)}</div>
                    <div className="app-info">
                      <h3>{app.replace(".exe", "")}</h3>
                      <p className="app-notes-count">{appNoteCount} notes</p>
                    </div>
                  </div>

                  {latestNote ? (
                    <div className="app-card-body">
                      <div className="note-section">
                        <label>Last left off</label>
                        <p className="note-text">{latestNote.where_left_off}</p>
                      </div>

                      <div className="note-section">
                        <label>Next step</label>
                        <p className="note-text">{latestNote.next_step}</p>
                      </div>

                      <div className="note-meta">
                        <span className="time-badge">
                          {formatTime(latestNote.captured_at)}
                        </span>
                        <span className="recall-badge">
                          👁️ {latestNote.recalled_count}x
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="app-card-empty">
                      <p>
                        No notes yet. Open and close this app to capture
                        context.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="dashboard-footer">
        <p>💡 Tip: Close any tracked app to capture your context instantly</p>
      </div>
    </div>
  );
}
