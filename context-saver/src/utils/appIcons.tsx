import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";

/**
 * App information with icon data from backend
 */
export interface AppInfo {
  name: string;
  path: string;
  icon: string | null; // file:// URI or base64
}

/**
 * Get clean application display name
 * Removes .exe extension and humanizes the name
 */
export const getAppDisplayName = (appName: string): string => {
  let name = appName;

  // Remove .exe extension
  if (name.endsWith(".exe")) {
    name = name.slice(0, -4);
  }

  // Convert camelCase to Title Case
  name = name
    .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2") // ABCDef
    .split(/[\s\-_]+/) // split on whitespace, hyphens, underscores
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return name;
};

/**
 * Get all installed applications with their icons from backend
 */
export const getAllAppsWithIcons = async (): Promise<AppInfo[]> => {
  try {
    const apps = await invoke<AppInfo[]>("get_all_apps");
    return apps;
  } catch (error) {
    console.error("Failed to get all apps:", error);
    return [];
  }
};

export const getAppIconElement = (app: AppInfo): React.ReactNode => {
  // If we have an icon path, load it using Tauri's convertFileSrc
  if (app.icon) {
    const imageUrl = convertFileSrc(app.icon);

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
          // Fallback to generic icon if image fails to load
          (e.target as HTMLImageElement).src =
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Crect x='2' y='2' width='16' height='16' rx='2' fill='%239CA3AF'/%3E%3Cpath d='M6 6h8M6 10h6M6 14h4' stroke='white' stroke-width='1' stroke-linecap='round'/%3E%3C/svg%3E";
        }}
      />
    );
  }

  // Generic application icon fallback
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="2" fill="#9CA3AF" />
      <path
        d="M6 6h8M6 10h6M6 14h4"
        stroke="white"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * Cache for app icon elements to avoid re-rendering
 */
const iconCache = new Map<string, React.ReactNode>();

/**
 * Get cached icon element for an app
 */
export const getCachedAppIcon = (app: AppInfo): React.ReactNode => {
  const cacheKey = `${app.name}-${app.icon}`;

  if (!iconCache.has(cacheKey)) {
    iconCache.set(cacheKey, getAppIconElement(app));
  }

  return iconCache.get(cacheKey);
};

/**
 * Convert Windows executable path to a URL that can be used as an image source
 * This handles the file:// protocol conversion for Windows paths
 */
export const exePathToImageUrl = (exePath: string): string => {
  if (exePath.startsWith("file://")) {
    return exePath;
  }

  // Convert Windows path to file:// URI
  // Handle both C:\path\to\file and /c/path/to/file formats
  let normalized = exePath.replace(/\\/g, "/");
  if (!normalized.startsWith("/")) {
    normalized = "/" + normalized;
  }
  return `file://${normalized}`;
};
