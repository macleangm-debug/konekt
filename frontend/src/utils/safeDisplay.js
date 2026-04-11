/**
 * safeDisplay — Global cell fallback helper
 * 
 * Every table cell must use this to prevent blank/empty cells.
 * Fallback values are context-aware and visually muted.
 */

const FALLBACKS = {
  text: "—",
  company: "N/A",
  phone: "Not Provided",
  email: "Not Provided",
  vendor: "Unassigned",
  payment: "Pending",
  date: "—",
  amount: "—",
  person: "Not Assigned",
  status: "Unknown",
  category: "Uncategorized",
  region: "Not Specified",
  code: "—",
};

/**
 * Returns value if truthy, otherwise a context-aware fallback.
 * @param {*} value - The value to display
 * @param {string} type - Context type for smart fallback (text|company|phone|email|vendor|payment|date|amount|person|status|category|region|code)
 * @returns {string}
 */
export function safeDisplay(value, type = "text") {
  if (value === null || value === undefined || value === "") {
    return FALLBACKS[type] || FALLBACKS.text;
  }
  if (typeof value === "string" && !value.trim()) {
    return FALLBACKS[type] || FALLBACKS.text;
  }
  return value;
}

/**
 * Returns a formatted money string, or fallback if zero/null.
 * @param {number} value
 * @param {boolean} showZero - If true, shows "TZS 0" instead of fallback
 * @returns {string}
 */
export function safeMoney(value, showZero = false) {
  const num = Number(value || 0);
  if (num === 0 && !showZero) return FALLBACKS.amount;
  return `TZS ${num.toLocaleString()}`;
}

/**
 * CSS class for muted fallback text styling.
 * Apply when the value is a fallback (not real data).
 */
export function isFallback(value) {
  if (value === null || value === undefined || value === "") return true;
  if (typeof value === "string" && !value.trim()) return true;
  return false;
}

/**
 * Returns the appropriate CSS class based on whether value is real or fallback.
 */
export function cellClass(value, realClass = "text-slate-800", fallbackClass = "text-slate-300 italic") {
  return isFallback(value) ? fallbackClass : realClass;
}

export default safeDisplay;
