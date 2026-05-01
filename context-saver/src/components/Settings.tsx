import React, { useEffect, useRef, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
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
  // Catalog of apps (initially from parent prop, but we'll refresh if needed)
  const [catalogApps, setCatalogApps] = useState<AppInfo[]>(
    allAvailableApps || [],
  );

  // Helper: deduplicate apps by path (keep first occurrence)
  const dedupeApps = (apps: AppInfo[]) => {
    const seen = new Set<string>();
    const out: AppInfo[] = [];
    for (const a of apps) {
      const key = (a.path || "").toLowerCase();
      if (!key) continue;
      if (seen.has(key)) {
        // skip duplicates; keep first occurrence
        continue;
      }
      seen.add(key);
      out.push(a);
    }
    return out;
  };

  // Use path as unique id for selection
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isLoadingApps, setIsLoadingApps] = useState(false);

  // Ref for apps list to reset scroll
  const appsListRef = useRef<HTMLDivElement>(null);

  // Initialize catalog and selection once on mount
  useEffect(() => {
    setCatalogApps(dedupeApps(allAvailableApps || []));
    // initialize selection from trackedApps
    const initial = new Set(trackedApps.map((a) => a.path));
    setSelectedPaths(initial);
    // If parent didn't provide apps, fetch from backend
    if (!allAvailableApps || allAvailableApps.length === 0) {
      setIsLoadingApps(true);
      (async () => {
        try {
          console.log("[Settings] Fetching all apps from backend...");
          const apps = await invoke<AppInfo[]>("get_all_apps");
          console.log(
            "[Settings] Loaded",
            apps?.length || 0,
            "apps from backend",
          );
          if (apps && apps.length > 0) setCatalogApps(dedupeApps(apps));
          else setCatalogApps([]);
        } catch (e) {
          console.error("[Settings] Failed to load apps:", e);
          setSaveError(`Could not load app list: ${String(e)}`);
        } finally {
          setIsLoadingApps(false);
        }
      })();
    }
    // run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset scroll position when search query changes and run DOM diagnostics
  useEffect(() => {
    if (appsListRef.current) {
      appsListRef.current.scrollTop = 0;
    }

    // Run DOM inspection automatically to help diagnose rendering issues
    try {
      const overlays = document.querySelectorAll(".settings-overlay").length;
      const modals = document.querySelectorAll(".settings-modal").length;
      const lists = document.querySelectorAll(".apps-list");
      const listsCount = lists.length;

      console.log(
        "[Settings] DOM CHECK - overlays:",
        overlays,
        "modals:",
        modals,
        "apps-list count:",
        listsCount,
      );

      const items = Array.from(document.querySelectorAll(".app-checkbox-item"));
      console.log("[Settings] DOM CHECK - rendered items count:", items.length);
      console.log(
        "[Settings] DOM CHECK - items sample names:",
        items.slice(0, 50).map((n) => n.innerText.trim()),
      );

      const listsInfo = Array.from(lists).map((el) => ({
        children: el.querySelectorAll(".app-checkbox-item").length,
        scrollTop: (el as HTMLElement).scrollTop,
        visibleHeight: (el as HTMLElement).clientHeight,
        totalHeight: (el as HTMLElement).scrollHeight,
        topMost: el
          .querySelector(".app-checkbox-item")
          ?.innerText.trim()
          .split("\n")[0],
      }));
      console.log("[Settings] DOM CHECK - lists info:", listsInfo);

      const parents = items.slice(0, 50).map((el) => ({
        name: el.innerText.trim().split("\n")[0],
        parentClass: el.parentElement?.className,
      }));
      console.log(
        "[Settings] DOM CHECK - items parent classes (sample):",
        parents,
      );

      const ancestors = items.slice(0, 10).map((el) => {
        const path: string[] = [];
        let cur: Element | null = el;
        while (cur && cur !== document.body && path.length < 20) {
          path.push((cur as HTMLElement).className || cur.tagName);
          cur = cur.parentElement;
        }
        return { name: el.innerText.trim().split("\n")[0], path };
      });
      console.log("[Settings] DOM CHECK - items ancestors sample:", ancestors);
    } catch (err) {
      console.error("[Settings] DOM CHECK error:", err);
    }
  }, [searchQuery]);

  // Derived filtered list using tokens (matches name, display name, path)
  const filteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return catalogApps;

    const tokens = q.split(/\s+/).filter(Boolean);
    return catalogApps.filter((app) => {
      const display = getAppDisplayName(app.name).toLowerCase();
      const text = [app.name, display, app.path].join(" ").toLowerCase();
      return tokens.every((t) => text.includes(t));
    });
  }, [catalogApps, searchQuery]);

  // Cleanup/hide any leftover DOM nodes that don't belong to filteredApps
  useEffect(() => {
    try {
      if (!appsListRef.current) return;
      const allowed = new Set(
        filteredApps.map((a) => (a.path || "").toLowerCase()),
      );
      const items = Array.from(
        appsListRef.current.querySelectorAll(".app-checkbox-item"),
      ) as HTMLElement[];
      items.forEach((el) => {
        const path = (el.getAttribute("data-path") || "").toLowerCase();
        if (!path) return;
        if (searchQuery && !allowed.has(path)) {
          el.style.display = "none";
        } else {
          el.style.display = "";
        }
      });
    } catch (err) {
      console.error("[Settings] DOM cleanup error:", err);
    }
  }, [filteredApps, searchQuery]);

  const selectedVisibleCount = filteredApps.filter((a) =>
    selectedPaths.has(a.path),
  ).length;
  const allVisibleSelected =
    filteredApps.length > 0 &&
    filteredApps.every((a) => selectedPaths.has(a.path));

  const togglePath = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleVisible = () => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredApps.forEach((a) => next.delete(a.path));
      } else {
        filteredApps.forEach((a) => next.add(a.path));
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const selected = Array.from(selectedPaths);
      // Map to records with name+path; preserve name if available in catalog
      const records = selected.map((p) => {
        const found = catalogApps.find((c) => c.path === p);
        return { name: found ? found.name : p, path: p };
      });

      console.log("[Settings] Saving", records.length, "apps:", records);
      const result = await invoke("save_tracked_apps", {
        trackedApps: records,
      });
      console.log("[Settings] Save result:", result);

      // Update parent with AppInfo objects
      const trackedInfos = records.map((r) => ({
        name: r.name,
        path: r.path,
        icon: catalogApps.find((c) => c.path === r.path)?.icon || null,
      }));
      onTrackedAppsChange(trackedInfos);
      onClose();
    } catch (e) {
      const errorMsg = String(e);
      console.error("[Settings] Failed to save tracked apps. Error:", e);
      setSaveError(`Save failed: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose} title="Close">
            ×
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3>Tracked Applications</h3>
            <p className="settings-description">
              Select which applications you want to track
            </p>

            <div className="settings-search-row">
              <div className="settings-search">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search applications"
                  aria-label="Search applications"
                  autoComplete="off"
                />
              </div>

              <button
                type="button"
                className={`settings-toggle-all-btn ${allVisibleSelected ? "is-active" : ""}`}
                onClick={toggleVisible}
                disabled={filteredApps.length === 0}
                aria-pressed={allVisibleSelected}
              >
                <span>
                  {allVisibleSelected ? "Clear visible" : "Select visible"}
                </span>
                <span style={{ marginLeft: 8 }}>
                  {selectedVisibleCount}/{filteredApps.length}
                </span>
              </button>
            </div>

            <div className="settings-controls">
              <span className="settings-selection-summary">
                {isLoadingApps
                  ? "Loading applications..."
                  : filteredApps.length === 0
                    ? "No matching apps"
                    : `${selectedVisibleCount} of ${filteredApps.length} visible apps selected`}
              </span>
            </div>

            {saveError && (
              <p className="settings-error">
                <strong>Error:</strong> {saveError}
              </p>
            )}

            <div className="apps-list" ref={appsListRef}>
              {isLoadingApps ? (
                <p className="no-apps">
                  Loading applications... This may take a moment.
                </p>
              ) : catalogApps.length === 0 ? (
                <p className="no-apps">No applications available</p>
              ) : filteredApps.length === 0 ? (
                <p className="no-apps">No applications match your search</p>
              ) : (
                <>
                  {(() => {
                    console.log(
                      "[Settings] RENDER - filteredApps.length:",
                      filteredApps.length,
                    );
                    console.log(
                      "[Settings] RENDER - filteredApps names:",
                      filteredApps.map((a) => a.name),
                    );
                    console.log(
                      "[Settings] RENDER - searchQuery:",
                      searchQuery,
                    );
                    return null;
                  })()}
                  {filteredApps.map((app) => (
                    <label
                      key={app.path}
                      data-path={app.path}
                      className="app-checkbox-item"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPaths.has(app.path)}
                        onChange={() => togglePath(app.path)}
                      />
                      <div className="app-icon-small">
                        {getAppIconElement(app)}
                      </div>
                      <span>{getAppDisplayName(app.name)}</span>
                    </label>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button
            className="settings-btn settings-btn-cancel"
            onClick={onClose}
            disabled={saving || isLoadingApps}
          >
            Cancel
          </button>
          <button
            className="settings-btn settings-btn-save"
            onClick={handleSave}
            disabled={saving || isLoadingApps}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
