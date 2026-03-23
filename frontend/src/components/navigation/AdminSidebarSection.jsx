import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function AdminSidebarSection({ title, links = [] }) {
  const location = useLocation();

  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-400 font-semibold px-2">
        {title}
      </div>

      <div className="space-y-2">
        {links.map((item) => {
          const active = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={[
                "block rounded-xl px-4 py-3 font-medium transition",
                active
                  ? "bg-[#20364D] text-white"
                  : item.highlight
                  ? "bg-[#F4E7BF] text-[#8B6A10]"
                  : "bg-white text-[#20364D] border hover:bg-slate-50",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
