import { useState } from "react";
import { formatTimestamp } from "../utils/formatTime";
import {
  getAppDisplayName,
  getAppIconElement,
  AppInfo,
} from "../utils/appIcons";
import AppHistory from "./AppHistory";
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
  trackedApps: AppInfo[];
  selectedApp: string | null;
  onSelectApp: (app: string) => void;
  onArchiveNote: (id: string) => void;
}

export default function Dashboard({ notes, trackedApps, selectedApp, onSelectApp, onArchiveNote }: Props) {
  const [showAllTrackedApps, setShowAllTrackedApps] = useState(false);
  const previewCount = Math.min(trackedApps.length, 5);

  // Create a map of app names to AppInfo for quick lookup
  const appInfoMap = new Map(trackedApps.map((app) => [app.name, app]));

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

  // Get latest note overall
  const latestNote =
    notes.length > 0
      ? notes.reduce((latest, current) =>
          new Date(current.captured_at).getTime() >
          new Date(latest.captured_at).getTime()
            ? current
            : latest,
        )
      : null;

  const selectedAppNotes = selectedApp ? notesByApp[selectedApp] || [] : [];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Your Owlnest Dashboard</h1>
        <p className="dashboard-subtitle">
          Manage your app history and notes
        </p>
      </div>

      <div className="dashboard-grid">
        {/* Tracked Apps Card */}
        <div className="dashboard-card running-apps-card">
          <div className="card-header">
            <h2>Tracked Applications</h2>
            <span className="card-badge">{trackedApps.length}</span>
          </div>
          <div className="card-subheader">
            Showing {previewCount} of {trackedApps.length} tracked apps by
            default
          </div>
          <div className="card-content">
            {trackedApps.length === 0 ? (
              <div className="empty-state">
                <p>No tracked applications selected</p>
              </div>
            ) : (
              <>
                <div className="apps-quick-list">
                  {(showAllTrackedApps
                    ? trackedApps
                    : trackedApps.slice(0, 5)
                  ).map((app) => {
                    const noteCount = notesByApp[app.name]?.length || 0;
                    return (
                      <div
                        key={app.name}
                        className={`quick-app-item clickable ${selectedApp === app.name ? "active" : ""}`}
                        onClick={() => onSelectApp(app.name)}
                      >
                        <div className="quick-app-icon">
                          {getAppIconElement(app)}
                        </div>
                        <div className="quick-app-info">
                          <div className="quick-app-name">
                            {getAppDisplayName(app.name)}
                          </div>
                          <div className="quick-app-notes">
                            {noteCount} note{noteCount !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {trackedApps.length > 5 && (
                  <button
                    type="button"
                    className="dashboard-see-more-btn"
                    onClick={() => setShowAllTrackedApps((current) => !current)}
                  >
                    {showAllTrackedApps
                      ? "Show Less"
                      : `See More (${trackedApps.length - 5})`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Latest Note Card */}
        <div className="dashboard-card latest-note-card">
          <div className="card-header">
            <h2>Latest Note</h2>
          </div>
          <div className="card-content">
            {latestNote ? (
              <div className="latest-note-content">
                <div className="latest-note-app">
                  <span className="latest-note-app-icon">
                    {getAppIconElement(
                      appInfoMap.get(latestNote.app_name) || {
                        name: latestNote.app_name,
                        path: "",
                        icon: null,
                      },
                    )}
                  </span>
                  <span className="latest-note-app-name">
                    {getAppDisplayName(latestNote.app_name)}
                  </span>
                </div>

                <div className="latest-note-time">
                  {formatTimestamp(latestNote.captured_at)}
                </div>

                <div className="latest-note-section">
                  <label>Left Off</label>
                  <p>{latestNote.where_left_off}</p>
                </div>

                <div className="latest-note-section">
                  <label>Next Step</label>
                  <p>{latestNote.next_step}</p>
                </div>

                <div className="latest-note-meta">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    style={{ marginRight: "4px" }}
                  >
                    <path d="M10 2C5.03 2 1 6 1 10s4.03 8 9 8 9-4 9-8-4.03-8-9-8zm0 14c-3.32 0-6-2.68-6-6s2.68-6 6-6 6 2.68 6 6-2.68 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" />
                  </svg>
                  <span>{latestNote.recalled_count}x recalled</span>
                </div>

                <div className="note-actions">
                  <button 
                    className="action-btn"
                    onClick={() => {
                      const text = `Left Off: ${latestNote.where_left_off}\nNext Step: ${latestNote.next_step}`;
                      navigator.clipboard.writeText(text);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Copy
                  </button>
                  <button 
                    className="action-btn"
                    onClick={() => onArchiveNote(latestNote.id)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                    Archive
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>No notes captured yet</p>
                <p className="empty-hint">Close an app to capture a note</p>
              </div>
            )}
          </div>
        </div>

        {/* App History Card - Full width if selected, otherwise empty state */}
        <div className="dashboard-card app-history-full">
          {selectedApp ? (
            <AppHistory app={selectedApp} notes={selectedAppNotes} onArchiveNote={onArchiveNote} />
          ) : (
            <div className="empty-state-full">
              <p>Select an application from the sidebar to see its history</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
