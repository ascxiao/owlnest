import React, { useState, useEffect } from "react";
import {
  getAppDisplayName,
  getAppIconElement,
  AppInfo,
} from "../utils/appIcons";
import "./Settings.css";

interface Props {
  onClose: () => void;
  trackedApps: AppInfo[];
  onTrackedAppsChange: (apps: AppInfo[]) => void;
  allAvailableApps: AppInfo[];
}

export default function Settings({
  onClose,
  trackedApps,
  onTrackedAppsChange,
  allAvailableApps,
}: Props) {
  // Initialize with tracked apps + running apps selected by default
  const trackedAppNames = new Set(trackedApps.map((app) => app.name));
  const [selectedApps, setSelectedApps] =
    useState<Set<string>>(trackedAppNames);

  useEffect(() => {
    // Update selectedApps when trackedApps changes
    const trackedNames = new Set(trackedApps.map((app) => app.name));
    setSelectedApps(trackedNames);
  }, [trackedApps]);

  const handleToggleApp = (appName: string) => {
    const newSelected = new Set(selectedApps);
    if (newSelected.has(appName)) {
      newSelected.delete(appName);
    } else {
      newSelected.add(appName);
    }
    setSelectedApps(newSelected);
  };

  const handleSave = () => {
    const selectedAppNames = Array.from(selectedApps);
    const selectedAppInfos = allAvailableApps.filter((app) =>
      selectedAppNames.includes(app.name),
    );
    onTrackedAppsChange(selectedAppInfos);
    onClose();
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose} title="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3>Tracked Applications</h3>
            <p className="settings-description">
              Select which applications you want to track for context saving
            </p>

            <div className="apps-list">
              {allAvailableApps.length === 0 ? (
                <p className="no-apps">No applications available</p>
              ) : (
                allAvailableApps.map((app) => (
                  <label key={app.name} className="app-checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedApps.has(app.name)}
                      onChange={() => handleToggleApp(app.name)}
                    />
                    <div className="app-icon-small">
                      {getAppIconElement(app)}
                    </div>
                    <span>{getAppDisplayName(app.name)}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button
            className="settings-btn settings-btn-cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="settings-btn settings-btn-save"
            onClick={handleSave}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
