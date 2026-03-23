import React from "react";
import PartnerProfileDropdown from "../partners/PartnerProfileDropdown";

export default function CustomerAccountTopbar({ onLogout }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 border-b bg-slate-50">
      <div>
        <div className="font-bold text-[#20364D]">My Account</div>
        <div className="text-sm text-slate-500">Track orders, services, invoices, and help</div>
      </div>
      <PartnerProfileDropdown
        name="Client"
        onLogout={onLogout}
        menu={[
          { label: "Orders", href: "/dashboard/orders" },
          { label: "Invoices", href: "/dashboard/invoices" },
          { label: "Help", href: "/help/customer" },
        ]}
      />
    </div>
  );
}
