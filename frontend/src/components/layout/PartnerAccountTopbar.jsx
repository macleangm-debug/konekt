import React from "react";
import PartnerProfileDropdown from "../partners/PartnerProfileDropdown";

export default function PartnerAccountTopbar({ onLogout }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 border-b bg-slate-50">
      <div>
        <div className="font-bold text-[#20364D]">Partner Workspace</div>
        <div className="text-sm text-slate-500">Manage affiliate or vendor activity</div>
      </div>
      <PartnerProfileDropdown
        name="Partner"
        onLogout={onLogout}
        menu={[
          { label: "Affiliate Dashboard", href: "/partner/affiliate-dashboard" },
          { label: "Vendor Dashboard", href: "/partner/vendor-dashboard" },
          { label: "Help", href: "/help/vendor" },
        ]}
      />
    </div>
  );
}
