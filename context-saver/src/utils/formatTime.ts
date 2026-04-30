/**
 * Format timestamp with proper relative time display
 * - Shows "X minutes ago" for < 1 hour
 * - Shows "X hours ago" for < 1 day
 * - Shows "Yesterday" for yesterday
 * - Shows "X days ago" for < 7 days
 * - Shows actual date format for >= 7 days
 */
export const formatTimestamp = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    const now = new Date();

    // Get time difference in milliseconds
    const diffMs = now.getTime() - date.getTime();

    // Convert to different time units
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // If less than a minute, show "Just now"
    if (diffMins < 1) {
      return "Just now";
    }

    // If less than 1 hour
    if (diffHours < 1) {
      return `${diffMins}m ago`;
    }

    // If less than 1 day (24 hours)
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    // Check if it's yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isYesterday) {
      return "Yesterday";
    }

    // If less than 7 days
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }

    // For older dates, show actual date
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch (error) {
    console.error("Error formatting timestamp:", error);
    return "Unknown";
  }
};

/**
 * Format timestamp with full time
 */
export const formatTimestampWithTime = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    console.error("Error formatting timestamp with time:", error);
    return "Unknown";
  }
};
