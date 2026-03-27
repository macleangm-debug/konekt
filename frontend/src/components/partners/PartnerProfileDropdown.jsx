import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Settings, User, LogOut } from "lucide-react";

export default function PartnerProfileDropdown({ name = "Account", onLogout, menu = [] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref} data-testid="profile-dropdown">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-11 w-11 rounded-full border bg-white flex items-center justify-center text-[#20364D] font-bold"
        data-testid="profile-dropdown-trigger"
      >
        {String(name || "A").slice(0, 1).toUpperCase()}
      </button>

      {open ? (
        <div className="absolute right-0 mt-3 w-64 rounded-2xl border bg-white shadow-lg p-3 z-40" data-testid="profile-dropdown-menu">
          <div className="px-3 py-2 border-b">
            <div className="font-semibold text-[#20364D]">{name}</div>
            <div className="text-xs text-slate-500 mt-1">Account menu</div>
          </div>

          <div className="py-2">
            {menu.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium text-[#20364D] hover:bg-slate-50"
                onClick={() => setOpen(false)}
                data-testid={`profile-menu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="border-t pt-2 space-y-1">
            <button
              type="button"
              onClick={() => { setOpen(false); onLogout(); }}
              className="w-full flex items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              data-testid="profile-logout-btn"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
