import React, { useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { adminNavigation } from "../../config/adminNavigation";
import { hasModuleAccess } from "../../lib/moduleAccess";
import { LogOut, ChevronDown, ChevronRight } from "lucide-react";
import SidebarBrand from "../layout/SidebarBrand";

export default function AdminSidebar() {
  const { user, logout } = useAuth();  const location = useLocation();
  const navigate = useNavigate();
  const [openKey, setOpenKey] = useState(null);

  const visibleNavigation = useMemo(() => {
    return adminNavigation
      .filter((group) => !group.moduleKey || hasModuleAccess(user, group.moduleKey))
      .map((group) => ({
        ...group,
        children: (group.children || []).filter(
          (item) => !item.moduleKey || hasModuleAccess(user, item.moduleKey)
        ),
      }))
      .filter((group) => (group.children || []).length > 0);
  }, [user]);

  const activeGroupKey =
    visibleNavigation.find((group) =>
      (group.children || []).some((item) => location.pathname.startsWith(item.href))
    )?.key || visibleNavigation[0]?.key;

  const currentOpen = openKey || activeGroupKey;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="w-[260px] border-r bg-white px-4 py-5 flex flex-col h-screen sticky top-0">
      <SidebarBrand />
      <div className="px-2">
        <div className="text-sm text-slate-500 mt-1" data-testid="admin-user-email">{user?.full_name || user?.email}</div>
      </div>

      <div className="space-y-2 mt-6 flex-1 overflow-y-auto">
        {visibleNavigation.map((group) => (
          <div key={group.key} className="rounded-2xl border overflow-hidden" data-testid={`nav-group-${group.key}`}>
            <button
              type="button"
              onClick={() => setOpenKey(currentOpen === group.key ? null : group.key)}
              className="w-full px-4 py-3 text-left bg-slate-50 font-semibold flex items-center justify-between"
              data-testid={`nav-toggle-${group.key}`}
            >
              <span>{group.label}</span>
              {currentOpen === group.key ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {currentOpen === group.key && (
              <div className="p-2 bg-white space-y-1">
                {group.children.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={({ isActive }) =>
                      `block rounded-xl px-3 py-2 text-sm transition-colors ${
                        isActive 
                          ? "bg-[#2D3E50] text-white" 
                          : "text-slate-700 hover:bg-slate-50"
                      }`
                    }
                    data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 rounded-xl"
          data-testid="logout-btn"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
