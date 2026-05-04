import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import RecallModal from "./components/RecallModal";
import "./App.css";

export default function RecallApp() {
  const [data, setData] = useState<any>(null);

  const [logs, setLogs] = useState<string[]>([]);
  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  useEffect(() => {
    async function loadData() {
      addLog("Calling get_pending_recall_data...");
      try {
        const d = await invoke<any>("get_pending_recall_data");
        addLog(`Received: ${JSON.stringify(d)}`);
        if (d) {
          setData(d);
          addLog("Data successfully set");
        } else {
          addLog("Data is null/empty!");
        }
      } catch (err) {
        addLog(`Error: ${err}`);
      }
    }
    loadData();
  }, []);

  if (!data) {
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
      <RecallModal
        data={data}
        onClose={() => getCurrentWindow().close()}
      />
    </div>
  );
}
