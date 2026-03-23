import React from "react";
import PartnerProfileDropdown from "../partners/PartnerProfileDropdown";

export default function AdminAccountTopbar({ onLogout }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 border-b bg-slate-50">
      <div>
        <div className="font-bold text-[#20364D]">Admin Workspace</div>
        <div className="text-sm text-slate-500">Manage the full Konekt operation</div>
      </div>
      <PartnerProfileDropdown
        name="Admin"
        onLogout={onLogout}
        menu={[
          { label: "Settings Hub", href: "/admin/settings-hub" },
          { label: "Help", href: "/help/admin" },
        ]}
      />
    </div>
  );
}
