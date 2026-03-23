import React from "react";
import { Link } from "react-router-dom";

const shortcuts = [
  { label: "Commercial Rules", href: "/admin/settings-hub#commercial-rules" },
  { label: "Payment Accounts", href: "/admin/settings-hub#payment-account-settings" },
  { label: "Launch Controls", href: "/admin/settings-hub#launch-controls" },
  { label: "Notifications", href: "/admin/settings-hub#notifications" },
];

export default function AdminQuickSettingsCard() {
  return (
    <div className="rounded-[2rem] border bg-white p-6">
      <div className="text-2xl font-bold text-[#20364D]">Quick Settings</div>
      <div className="grid md:grid-cols-2 gap-3 mt-5">
        {shortcuts.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="rounded-xl border px-4 py-3 font-semibold text-[#20364D] hover:bg-slate-50"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
