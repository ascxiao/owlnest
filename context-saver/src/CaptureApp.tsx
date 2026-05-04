import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import CaptureModal from "./components/CaptureModal";
import "./App.css";

export default function CaptureApp() {
  const [appName, setAppName] = useState<string>("");

  const [logs, setLogs] = useState<string[]>([]);
  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  useEffect(() => {
    async function loadData() {
      addLog("Calling get_pending_capture_data...");
      try {
        const data = await invoke<{ appName: string } | null>("get_pending_capture_data");
        addLog(`Received: ${JSON.stringify(data)}`);
        if (data && data.appName) {
          setAppName(data.appName);
          addLog(`Set appName to: ${data.appName}`);
        } else {
          addLog("Data or appName is null/empty!");
        }
      } catch (err) {
        addLog(`Error: ${err}`);
      }
    }
    loadData();
  }, []);

  const handleSaveCapture = async (whereLeftOff: string, nextStep: string) => {
    try {
      await invoke("save_capture", {
        appName,
        whereLeftOff,
        nextStep,
      });
      await emit("capture-saved");
      await getCurrentWindow().close();
    } catch (error) {
      console.error("Failed to save capture:", error);
    }
  };

  if (!appName) {
    return (
      <div className="loading-container" style={{ padding: 20, color: "black" }}>
        <h2>Loading...</h2>
        <div style={{ marginTop: 10, fontSize: 12, fontFamily: "monospace" }}>
          {logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="window-container" style={{ width: "100%", height: "100%", background: "var(--bg-color)" }}>
      <CaptureModal
        app_name={appName}
        onSave={handleSaveCapture}
        onSkip={() => getCurrentWindow().close()}
      />
    </div>
  );
}
