/**
 * Check if user has access to a module
 * For now, admin users have access to all modules
 */
export function hasModuleAccess(user, moduleKey) {
  if (!user) return false;
  
  const role = user.role || "customer";
  
  // Admin and super_admin have access to everything
  if (role === "admin" || role === "super_admin") {
    return true;
  }
  
  // Role-based module access
  const roleModules = {
    sales: ["dashboard", "crm", "quotes", "customers", "orders"],
    finance: ["dashboard", "finance", "quotes", "customers"],
    production: ["dashboard", "orders", "production", "inventory", "tasks"],
    marketing: ["dashboard", "marketing", "inventory"],
    support: ["dashboard", "crm", "orders", "customers"],
  };
  
  const allowedModules = roleModules[role] || [];
  return allowedModules.includes(moduleKey);
}
