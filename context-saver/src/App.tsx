import { useState, useEffect, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import CaptureModal from "./components/CaptureModal";
import RecallModal from "./components/RecallModal";
import Dashboard from "./components/Dashboard";
import Sidebar from "./components/Sidebar";
import Settings from "./components/Settings.tsx";
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
  const [isInitialized, setIsInitialized] = useState(false);
  const trackedAppMap = useMemo(() => {
    const m = new Map<string, AppInfo>();
    trackedApps.forEach((app) => {
      if (app && app.path) m.set(app.path.toLowerCase(), app);
    });
    return m;
  }, [trackedApps]);

  // Refs to access latest trackedApps/allAvailableApps inside event handlers
  const trackedAppsRef = useRef<AppInfo[]>(trackedApps);
  const allAvailableAppsRef = useRef<AppInfo[]>(allAvailableApps);
  useEffect(() => {
    trackedAppsRef.current = trackedApps;
  }, [trackedApps]);
  useEffect(() => {
    allAvailableAppsRef.current = allAvailableApps;
  }, [allAvailableApps]);

  const runningTrackedApps = useMemo(() => {
    if (!runningApps || runningApps.length === 0) return [];

    const results: AppInfo[] = [];
    const seen = new Set<string>();

    // Helpers
    const basename = (p: string) => {
      if (!p) return "";
      const parts = p.split(/[\\/]/g);
      return parts[parts.length - 1].toLowerCase();
    };

    // Precompute tracked maps
    const trackedByPath = new Map<string, AppInfo>();
    const trackedByBasename = new Map<string, AppInfo>();
    trackedApps.forEach((a) => {
      if (!a) return;
      const path = (a.path || "").toLowerCase();
      const base = basename(a.path || a.name || "");
      if (path) trackedByPath.set(path, a);
      if (base) trackedByBasename.set(base, a);
    });

    for (const run of runningApps) {
      const runPath = (run.path || "").toLowerCase();
      const runBase = basename(run.path || run.name || "");

      let match: AppInfo | undefined;

      // 1) Exact path
      if (runPath && trackedByPath.has(runPath)) {
        match = trackedByPath.get(runPath);
      }

      // 2) Basename match (e.g., chrome.exe)
      if (!match && runBase && trackedByBasename.has(runBase)) {
        match = trackedByBasename.get(runBase);
      }

      // If matched and not yet added, push
      if (match) {
        const key = (match.path || match.name || "").toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          results.push(match);
        }
      }
    }

    return results;
  }, [runningApps, trackedAppMap]);

  // Load all notes on startup
  useEffect(() => {
    const initializeAppData = async () => {
      await loadAllNotes();
      await loadRunningApps();
      const allApps = await loadAllAvailableApps();
      await loadTrackedApps(allApps);
      setIsInitialized(true);
    };

    if (!isInitialized) {
      initializeAppData();
    }
  }, [isInitialized]);

  // Helper: dedupe AppInfo array by path (keep first occurrence)
  const dedupeByPath = (apps: AppInfo[]) => {
    const seen = new Set<string>();
    const out: AppInfo[] = [];
    for (const a of apps || []) {
      const key = (a?.path || a?.name || "").toLowerCase();
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(a);
    }
    return out;
  };

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

  const loadTrackedApps = async (allAppsOverride?: AppInfo[]) => {
    try {
      // Load tracked apps from database (now returns objects with name+path)
      const trackedRecords =
        await invoke<{ name: string; path: string }[]>("load_tracked_apps");
      const allApps = allAppsOverride || allAvailableApps;

      if (trackedRecords && trackedRecords.length > 0) {
        // Map tracked records back to available apps by path
        const tracked = trackedRecords
          .map(
            (rec) =>
              allApps.find((a) => a.path === rec.path) || {
                name: rec.name,
                path: rec.path,
                icon: null,
              },
          )
          .filter(Boolean) as AppInfo[];
        setTrackedApps(dedupeByPath(tracked));
      } else {
        setTrackedApps([]);
      }
    } catch (error) {
      console.error("Failed to load tracked apps:", error);
      setTrackedApps([]);
    }
  };

  const loadAllAvailableApps = async () => {
    try {
      // Try using cached apps for fast startup, then refresh in background
      const CACHE_KEY = "cachedApps";
      const CACHE_TIME_KEY = "appsCacheTime";
      const CACHE_TTL = 1000 * 60 * 60 * 24; // 24h

      // Read cache
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        const time = parseInt(localStorage.getItem(CACHE_TIME_KEY) || "0");
        if (raw) {
          const parsed = JSON.parse(raw) as AppInfo[];
          if (Date.now() - time < CACHE_TTL) {
            console.log("[App] Using cached apps (fast startup)");
            setAllAvailableApps(parsed);
            // Kick off background refresh but don't await
            (async () => {
              try {
                console.log("[App] Background refresh: fetching fresh apps...");
                const fresh = await invoke<AppInfo[]>("get_all_apps");
                const availableFresh = fresh || [];
                setAllAvailableApps(availableFresh);
                localStorage.setItem(CACHE_KEY, JSON.stringify(availableFresh));
                localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
                console.log(
                  "[App] Background refresh complete:",
                  availableFresh.length,
                );
              } catch (err) {
                console.error("[App] Background refresh failed:", err);
              }
            })();
            return parsed;
          }
        }
      } catch (err) {
        console.warn("[App] Failed to read app cache:", err);
      }

      // No valid cache, load synchronously (first run)
      console.log("[App] Starting to load all available apps...");
      const apps = await invoke<AppInfo[]>("get_all_apps");
      console.log("[App] Loaded", apps?.length || 0, "available apps");
      const availableApps = dedupeByPath(apps || []);
      setAllAvailableApps(availableApps);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(availableApps));
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
      } catch (err) {
        console.warn("[App] Failed to write app cache:", err);
      }
      return availableApps;
    } catch (error) {
      console.error("[App] Failed to load all available apps:", error);
      // Fallback to running apps if backend doesn't support listing all apps
      setAllAvailableApps(runningApps);
      return runningApps;
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
            const procName = event.payload.app;
            console.log("[App] App closed event received:", procName);

            // Open capture modal immediately with the raw process name
            setCurrentApp(procName);
            setShowCapture(true);

            // Map the process to a tracked app in background using refs, then refresh running apps
            (async () => {
              try {
                const normalize = (s: string) => (s || "").toLowerCase();
                const pLower = normalize(procName);

                const trackedList = trackedAppsRef.current || [];
                const availableList = allAvailableAppsRef.current || [];

                const matchesProc = (a: AppInfo) => {
                  const path = normalize(a.path || "");
                  const name = normalize(a.name || "");
                  if (!path && !name) return false;
                  // exact exe/basename match
                  if (
                    path.endsWith(pLower) ||
                    path.endsWith(pLower + ".exe") ||
                    path.includes(pLower)
                  )
                    return true;
                  if (name.includes(pLower)) return true;
                  return false;
                };

                let matched = trackedList.find(matchesProc);
                if (!matched) matched = availableList.find(matchesProc);

                if (matched) {
                  const current = matched.name || matched.path;
                  console.log(
                    "[App] Mapped closed process to tracked app:",
                    current,
                  );
                  setCurrentApp(current);
                }

                // Refresh running apps so UI reflects closed app removal
                await loadRunningApps();
              } catch (err) {
                console.error("[App] Error mapping closed process:", err);
                // still refresh running apps
                await loadRunningApps();
              }
            })();
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

            // Map the process to a tracked app in background using refs
            (async () => {
              try {
                const normalize = (s: string) => (s || "").toLowerCase();
                const pLower = normalize(app);

                const trackedList = trackedAppsRef.current || [];
                const availableList = allAvailableAppsRef.current || [];

                const matchesProc = (a: AppInfo) => {
                  const path = normalize(a.path || "");
                  const name = normalize(a.name || "");
                  if (!path && !name) return false;
                  if (
                    path.endsWith(pLower) ||
                    path.endsWith(pLower + ".exe") ||
                    path.includes(pLower)
                  )
                    return true;
                  if (name.includes(pLower)) return true;
                  return false;
                };

                let matched = trackedList.find(matchesProc);
                if (!matched) matched = availableList.find(matchesProc);

                const appIdentifier = matched
                  ? matched.name || matched.path
                  : app;
                console.log("[App] Mapped launched process to:", appIdentifier);

                const data = await invoke<any>("get_latest_capture", {
                  appName: appIdentifier,
                });
                if (data) {
                  console.log("[App] Got recall data for app:", appIdentifier);
                  setRecallData(data);
                  setShowRecall(true);
                }
              } catch (err) {
                console.error("[App] Error fetching recall data:", err);
              }
            })();
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

    // Keep dashboard state fresh even when the backend emits no event
    const runningAppsTimer = window.setInterval(() => {
      loadRunningApps();
    }, 2000);

    return () => {
      window.clearInterval(runningAppsTimer);
    };
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

  const handleTrackedAppsChange = (apps: AppInfo[]) => {
    setTrackedApps(dedupeByPath(apps));
    // Settings component handles saving to database via invoke("save_tracked_apps", ...)
  };

  return (
    <div className="app-layout">
      {showCapture && currentApp && (
        <CaptureModal
          app_name={currentApp}
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
        runningApps={runningTrackedApps}
        selectedApp={selectedApp}
        onSelectApp={setSelectedApp}
        onSettingsClick={() => setShowSettings(true)}
      />

      <Dashboard
        notes={allNotes}
        trackedApps={trackedApps}
        selectedApp={selectedApp}
      />
    </div>
  );
}
