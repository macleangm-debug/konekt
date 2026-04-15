/**
 * Clears all authentication tokens and user data from localStorage.
 * Used across all portals (Customer, Admin, Partner) for clean logout.
 */
export function clearAllAuth() {
  const keys = [
    "konekt_token",
    "konekt_admin_token",
    "konekt_staff_token",
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
  if (["admin", "sales_manager", "finance_manager", "vendor_ops", "staff"].includes(role)) return "/admin";
  if (["sales", "marketing", "production", "supervisor"].includes(role)) return "/staff";
  if (role === "affiliate") return "/partner/affiliate-dashboard";
  if (["partner", "vendor"].includes(role)) return "/partner";
  return "/account";
}
