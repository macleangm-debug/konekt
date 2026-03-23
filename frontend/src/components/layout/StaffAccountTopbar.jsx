import React from "react";
import PartnerProfileDropdown from "../partners/PartnerProfileDropdown";

export default function StaffAccountTopbar({ onLogout }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 border-b bg-slate-50">
      <div>
        <div className="font-bold text-[#20364D]">Staff Workspace</div>
        <div className="text-sm text-slate-500">Work leads, quotes, and coordination</div>
      </div>
      <PartnerProfileDropdown
        name="Staff"
        onLogout={onLogout}
        menu={[
          { label: "Commission Dashboard", href: "/staff/commission-dashboard" },
          { label: "Help", href: "/help/sales" },
        ]}
      />
    </div>
  );
}
