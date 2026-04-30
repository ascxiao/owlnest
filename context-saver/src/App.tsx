import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import CaptureModal from "./components/CaptureModal";
import RecallModal from "./components/RecallModal";
import Dashboard from "./components/Dashboard";
import Sidebar from "./components/Sidebar";
import Settings from "./components/Settings";
import { AppInfo } from "./utils/appIcons";
import "./App.css";

interface CaptureNote {
  id: string;
  app_name: string;
  where_left_off: string;
  next_step: string;
  captured_at: string;
  recalled_count: number;
}

export default function App() {
  const [showCapture, setShowCapture] = useState(false);
  const [showRecall, setShowRecall] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentApp, setCurrentApp] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [recallData, setRecallData] = useState<any>(null);
  const [allNotes, setAllNotes] = useState<CaptureNote[]>([]);
  const [runningApps, setRunningApps] = useState<AppInfo[]>([]);
  const [trackedApps, setTrackedApps] = useState<AppInfo[]>([]);
  const [allAvailableApps, setAllAvailableApps] = useState<AppInfo[]>([]);

  // Load all notes on startup
  useEffect(() => {
    loadAllNotes();
    loadRunningApps();
    loadTrackedApps();
    loadAllAvailableApps();
  }, []);

  const loadAllNotes = async () => {
    try {
      const notes = await invoke<CaptureNote[]>("get_all_captures");
      setAllNotes(notes || []);
    } catch (error) {
      console.error("Failed to load notes:", error);
    }
  };

  const loadRunningApps = async () => {
    try {
      const apps = await invoke<AppInfo[]>("get_running_apps");
      console.log("Running apps:", apps);
      setRunningApps(apps || []);
    } catch (error) {
      console.error("Failed to load running apps:", error);
    }
  };

  const loadTrackedApps = async () => {
    try {
      // For now, use running apps as tracked apps
      // You can implement actual tracking list in Tauri backend
      const apps = await invoke<AppInfo[]>("get_running_apps");
      setTrackedApps(apps || []);
    } catch (error) {
      console.error("Failed to load tracked apps:", error);
    }
  };

  const loadAllAvailableApps = async () => {
    try {
      // Load all installed applications from the system
      const apps = await invoke<AppInfo[]>("get_all_apps");
      console.log("All available apps:", apps);
      setAllAvailableApps(apps || []);
    } catch (error) {
      console.error("Failed to load all available apps:", error);
      // Fallback to running apps if backend doesn't support listing all apps
      setAllAvailableApps(runningApps);
    }
  };

  useEffect(() => {
    // Listen for process events from Rust backend
    const setupListeners = async () => {
      try {
        console.log("[App::setupListeners] Loading initial data");
        await loadAllNotes();
        await loadRunningApps();
        console.log("[App::setupListeners] Initial data loaded");

        // Listen for app closed events
        console.log("[App::setupListeners] Setting up app-closed listener");
        const unlistenClosed = await listen<{ app: string }>(
          "app-closed",
          (event) => {
            const app = event.payload.app;
            console.log("[App] App closed event received:", app);
            setCurrentApp(app);
            console.log("[App] Set currentApp to:", app);
            setShowCapture(true);
            console.log("[App] Modal opened for app:", app);
          },
        );
        console.log("[App::setupListeners] app-closed listener registered");

        // Listen for app launched events
        console.log("[App::setupListeners] Setting up app-launched listener");
        const unlistenLaunched = await listen<{ app: string }>(
          "app-launched",
          (event) => {
            const app = event.payload.app;
            console.log("[App] App launched event received:", app);
            // Refresh running apps when one launches
            loadRunningApps();
            invoke("get_latest_capture", { appName: app }).then((data: any) => {
              if (data) {
                console.log("[App] Got recall data for app:", app);
                setRecallData(data);
                setShowRecall(true);
              }
            });
          },
        );
        console.log("[App::setupListeners] app-launched listener registered");

        return () => {
          unlistenClosed();
          unlistenLaunched();
        };
      } catch (error) {
        console.error(
          "[App::setupListeners] Failed to setup listeners:",
          error,
        );
      }
    };

    setupListeners();
  }, []);

  const handleSaveCapture = async (whereLeftOff: string, nextStep: string) => {
    console.log("[App] handleSaveCapture called");
    console.log("[App] currentApp:", currentApp);
    console.log("[App] whereLeftOff:", whereLeftOff);
    console.log("[App] nextStep:", nextStep);

    if (!currentApp) {
      console.error("[App] No current app set!");
      throw new Error("No app selected");
    }

    try {
      console.log("[App] Calling invoke save_capture...");
      console.log("[App] Parameters object:", {
        appName: currentApp,
        whereLeftOff,
        nextStep,
      });
      const result = await invoke("save_capture", {
        appName: currentApp,
        whereLeftOff,
        nextStep,
      });
      console.log("[App] invoke returned:", result);
      console.log("[App] Setting showCapture to false");
      setShowCapture(false);
      console.log("[App] Calling loadAllNotes");
      loadAllNotes();
      console.log("[App] Save completed successfully");
    } catch (error) {
      console.error("[App] Error in handleSaveCapture:", error);
      console.error("[App] Error type:", typeof error);
      console.error("[App] Error message:", (error as Error).message);
      throw error;
    }
  };

  const handleTrackedAppsChange = async (apps: AppInfo[]) => {
    setTrackedApps(apps);
    // TODO: Persist tracked apps to backend
    // await invoke("set_tracked_apps", { apps: apps.map(a => a.name) });
  };

  return (
    <div className="app-layout">
      {showCapture && currentApp && (
        <CaptureModal
          appName={currentApp}
          onSave={handleSaveCapture}
          onSkip={() => setShowCapture(false)}
        />
      )}
      {showRecall && recallData && (
        <RecallModal data={recallData} onClose={() => setShowRecall(false)} />
      )}
      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          trackedApps={trackedApps}
          onTrackedAppsChange={handleTrackedAppsChange}
          allAvailableApps={allAvailableApps}
        />
      )}

      <Sidebar
        runningApps={runningApps}
        selectedApp={selectedApp}
        onSelectApp={setSelectedApp}
        onSettingsClick={() => setShowSettings(true)}
      />

      <Dashboard
        notes={allNotes}
        monitoredApps={runningApps}
        selectedApp={selectedApp}
      />
    </div>
  );
}
