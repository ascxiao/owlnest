import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import React from "react";

export interface AppInfo {
  name: string;
  path: string;
  icon: string | null; // Will now primarily be a data: URI from Rust
}

const isRenderableImageSource = (value: string): boolean => {
  const normalized = value.toLowerCase();
  return (
    normalized.startsWith("data:") ||
    normalized.startsWith("http:") ||
    normalized.startsWith("https:") ||
    normalized.endsWith(".png") ||
    normalized.endsWith(".jpg") ||
    normalized.endsWith(".jpeg") ||
    normalized.endsWith(".webp") ||
    normalized.endsWith(".gif") ||
    normalized.endsWith(".ico")
  );
};

const getAppBadge = (appName: string): string => {
  const displayName = getAppDisplayName(appName);
  const words = displayName.split(" ").filter(Boolean);

  if (words.length === 0) return "A";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

export const getAppDisplayName = (appName: string): string => {
  let name = appName;
  if (name.endsWith(".exe")) name = name.slice(0, -4);

  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .split(/[\s\-_]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export const getAllAppsWithIcons = async (): Promise<AppInfo[]> => {
  try {
    return await invoke<AppInfo[]>("get_all_apps");
  } catch (error) {
    console.error("Failed to get all apps:", error);
    return [];
  }
};

export const getAppIconElement = (app: AppInfo): React.ReactNode => {
  if (app.icon && isRenderableImageSource(app.icon)) {
    // FIX: Only use convertFileSrc for local file paths.
    // If Rust sends a Base64 "data:" URI, use it directly.
    const imageUrl =
      app.icon.startsWith("data:") || app.icon.startsWith("http")
        ? app.icon
        : convertFileSrc(app.icon);

    return (
      <img
        src={imageUrl}
        alt={app.name}
        style={{
          width: "20px",
          height: "20px",
          objectFit: "contain",
          imageRendering: "crisp-edges",
        }}
        onError={(e) => {
          console.warn(`Failed to load icon for ${app.name} from ${app.path}`);
          (e.target as HTMLImageElement).src =
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Crect x='2' y='2' width='16' height='16' rx='2' fill='%239CA3AF'/%3E%3Cpath d='M6 6h8M6 10h6M6 14h4' stroke='white' stroke-width='1' stroke-linecap='round'/%3E%3C/svg%3E";
        }}
      />
    );
  }

  const badge = getAppBadge(app.name);

  return (
    <div
      style={{
        width: "20px",
        height: "20px",
        borderRadius: "6px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f766e 0%, #2563eb 100%)",
        color: "white",
        fontSize: "9px",
        fontWeight: 700,
        letterSpacing: "0.02em",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.14)",
      }}
      aria-hidden="true"
    >
      {badge}
    </div>
  );
};

const iconCache = new Map<string, React.ReactNode>();

export const getCachedAppIcon = (app: AppInfo): React.ReactNode => {
  const cacheKey = `${app.name}-${app.icon}`;
  if (!iconCache.has(cacheKey)) {
    iconCache.set(cacheKey, getAppIconElement(app));
  }
  return iconCache.get(cacheKey);
};
