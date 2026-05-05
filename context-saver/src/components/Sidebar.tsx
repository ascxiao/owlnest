import {
  getAppDisplayName,
  getAppIconElement,
  AppInfo,
} from "../utils/appIcons";
import "./Sidebar.css";

interface Props {
  runningApps: AppInfo[];
  selectedApp: string | null;
  onSelectApp: (app: string) => void;
  currentView: "dashboard" | "archive";
  onViewChange: (view: "dashboard" | "archive") => void;
  onSettingsClick: () => void;
}

export default function Sidebar({
  runningApps,
  selectedApp,
  onSelectApp,
  currentView,
  onViewChange,
  onSettingsClick,
}: Props) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">Owlnest</h1>
      </div>

      <div className="sidebar-nav">
        <button 
          className={`sidebar-nav-item ${currentView === "dashboard" ? "active" : ""}`}
          onClick={() => onViewChange("dashboard")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          Dashboard
        </button>
        <button 
          className={`sidebar-nav-item ${currentView === "archive" ? "active" : ""}`}
          onClick={() => onViewChange("archive")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="21 8 21 21 3 21 3 8"></polyline>
            <rect x="1" y="3" width="22" height="5"></rect>
            <line x1="10" y1="12" x2="14" y2="12"></line>
          </svg>
          Archive
        </button>
      </div>

      <div className="sidebar-content">
        <h3 className="sidebar-section-title">Running Tracked Apps</h3>

        {runningApps.length === 0 ? (
          <div className="sidebar-empty">
            <p>No tracked apps running</p>
          </div>
        ) : (
          <div className="sidebar-apps-list">
            {runningApps.map((app) => (
              <button
                key={app.name}
                className={`sidebar-app-item ${selectedApp === app.name ? "active" : ""}`}
                onClick={() => onSelectApp(app.name)}
              >
                <div className="app-item-icon">{getAppIconElement(app)}</div>
                <div className="app-item-name">
                  {getAppDisplayName(app.name)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <button
          className="sidebar-settings-btn"
          onClick={onSettingsClick}
          title="Settings"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="currentColor"
            style={{ marginRight: "6px" }}
          >
            <path d="M10 2a1 1 0 011 1v1.5a1 1 0 01-2 0V3a1 1 0 011-1z" />
            <path d="M4 6a1 1 0 100-2 1 1 0 000 2zM16 6a1 1 0 100-2 1 1 0 000 2zM3 10a1 1 0 110-2 1 1 0 010 2zM17 10a1 1 0 110-2 1 1 0 010 2zM4 14a1 1 0 100-2 1 1 0 000 2zM16 14a1 1 0 100-2 1 1 0 000 2zM10 16a1 1 0 011 1v1.5a1 1 0 01-2 0V17a1 1 0 011-1z" />
            <circle cx="10" cy="10" r="3" fill="white" />
          </svg>
          Settings
        </button>
      </div>
    </div>
  );
}
