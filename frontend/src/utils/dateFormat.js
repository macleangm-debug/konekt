/**
 * Canonical date formatting for the Konekt platform.
 * Use these functions EVERYWHERE instead of inline Date formatting.
 * Format: DD MMM YYYY, HH:mm (e.g., "10 Apr 2026, 14:30")
 */

/**
 * Format a date string or Date object to the standard display format.
 * @param {string|Date|null} dateInput - ISO string, Date object, or null
 * @param {object} options - { showTime: boolean (default true) }
 * @returns {string} Formatted date string or "—" if invalid
 */
export function formatDate(dateInput, { showTime = true } = {}) {
  if (!dateInput) return "—";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "—";

    const day = String(d.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    if (!showTime) return `${day} ${month} ${year}`;

    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}:${mins}`;
  } catch {
    return "—";
  }
}

/**
 * Format a date to short format (no time). E.g., "10 Apr 2026"
 */
export function formatDateShort(dateInput) {
  return formatDate(dateInput, { showTime: false });
}

/**
 * Format a date to relative time. E.g., "2 hours ago", "3 days ago"
 */
export function formatRelative(dateInput) {
  if (!dateInput) return "—";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "—";
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(d, { showTime: false });
  } catch {
    return "—";
  }
}
