import React from "react";
import PartnerProfileDropdown from "../partners/PartnerProfileDropdown";
import NotificationBell from "../shared/NotificationBell";

export default function PartnerAccountTopbar({ onLogout }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 border-b bg-slate-50" data-testid="partner-topbar">
      <div>
        <div className="font-bold text-[#20364D]">Partner Workspace</div>
        <div className="text-sm text-slate-500">Manage fulfillment and vendor activity</div>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell tokenKey="partner_token" defaultRedirect="/partner" />
        <PartnerProfileDropdown
          name="Partner"
          onLogout={onLogout}
          menu={[
            { label: "Vendor Dashboard", href: "/partner/vendor-dashboard" },
            { label: "Help", href: "/help/vendor" },
          ]}
        />
      </div>
    </div>
  );
}
