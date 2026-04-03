import React from "react";
import { Link } from "react-router-dom";

const actions = [
  {
    title: "Configuration Hub",
    desc: "Open launch-critical settings and business configuration.",
    href: "/admin/configuration",
  },
  {
    title: "Business Pricing Requests",
    desc: "Review incoming business pricing and relationship-building requests.",
    href: "/admin/business-pricing-requests",
  },
  {
    title: "Launch Readiness",
    desc: "Review environment readiness, runtime integrations, and operational gaps.",
    href: "/admin/launch-readiness",
  },
  {
    title: "Verification Pass",
    desc: "Run the admin-side checklist before controlled launch.",
    href: "/admin/verification-pass",
  },
];

export default function AdminQuickActionGrid() {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
      {actions.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          className="rounded-[2rem] border bg-white p-6 hover:shadow-md transition"
        >
          <div className="text-xl font-bold text-[#20364D]">{item.title}</div>
          <p className="text-slate-600 mt-3 text-sm leading-6">{item.desc}</p>
          <div className="mt-5 text-sm font-semibold text-[#20364D]">Open →</div>
        </Link>
      ))}
    </div>
  );
}
