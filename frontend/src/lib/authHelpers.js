/**
 * Clears all authentication tokens and user data from localStorage.
 * Used across all portals (Customer, Admin, Partner) for clean logout.
 */
export function clearAllAuth() {
  const keys = [
    "konekt_token",
    "konekt_admin_token",
    "partner_token",
    "token",
    "customer",
    "userRole",
    "userId",
    "userEmail",
    "userName",
  ];
  keys.forEach((k) => localStorage.removeItem(k));
}

/**
 * Returns the redirect path based on stored user role.
 */
export function getDashboardPath(role) {
  if (["admin", "sales", "marketing", "production"].includes(role)) return "/admin";
  if (["partner", "vendor", "affiliate"].includes(role)) return "/partner";
  return "/dashboard";
}
