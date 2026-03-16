import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function GroupedSidebar({ groups = [], user = {} }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState({});

  const toggleGroup = (key) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside className="w-[260px] min-h-screen bg-[#1a2b3c] text-white px-3 py-5 overflow-y-auto flex flex-col" data-testid="grouped-sidebar">
      <div className="px-3 mb-6">
        <div className="text-xl font-bold text-white">Konekt</div>
        <div className="text-xs text-slate-400 mt-1">Business OS</div>
      </div>

      <div className="flex-1 space-y-1">
        {groups.map((group) => {
          const isCollapsed = collapsed[group.key];
          const hasActiveItem = group.items.some(
            (item) => location.pathname === item.href || location.pathname.startsWith(item.href + "/")
          );

          return (
            <div key={group.key} className="mb-2">
              <button
                onClick={() => toggleGroup(group.key)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide rounded-lg transition ${
                  hasActiveItem ? "text-[#D4A843]" : "text-slate-400 hover:text-slate-200"
                }`}
                data-testid={`nav-group-${group.key}`}
              >
                <span>{group.label}</span>
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {!isCollapsed && (
                <div className="mt-1 space-y-0.5 pl-1">
                  {group.items.map((item) => {
                    const active =
                      location.pathname === item.href ||
                      (item.href !== "/admin" && location.pathname.startsWith(item.href + "/"));
                    const exactActive = location.pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                          active || exactActive
                            ? "bg-[#D4A843] text-[#1a2b3c]"
                            : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                        }`}
                        data-testid={`nav-item-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {user?.full_name && (
        <div className="mt-4 pt-4 border-t border-slate-700 px-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#D4A843] text-[#1a2b3c] flex items-center justify-center font-bold text-sm">
              {user.full_name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user.full_name}</div>
              <div className="text-xs text-slate-400 capitalize">
                {(user.role || "staff").replace("_", " ")}
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
