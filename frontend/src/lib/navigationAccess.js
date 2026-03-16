import { ADMIN_NAVIGATION_GROUPS } from "../config/adminNavigationGroups";
import { ROLE_MODULE_ACCESS } from "../config/roleModuleAccess";

export function getNavigationGroupsForRole(role = "sales") {
  // Normalize role - treat "admin" as "super_admin" for full access
  const normalizedRole = role === "admin" ? "super_admin" : role;
  const allowed = ROLE_MODULE_ACCESS[normalizedRole] || ROLE_MODULE_ACCESS["sales"];

  return ADMIN_NAVIGATION_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => allowed.includes(item.moduleKey)),
    }))
    .filter((group) => group.items.length > 0);
}

export function canAccessModule(role, moduleKey) {
  const normalizedRole = role === "admin" ? "super_admin" : role;
  const allowed = ROLE_MODULE_ACCESS[normalizedRole] || [];
  return allowed.includes(moduleKey);
}
