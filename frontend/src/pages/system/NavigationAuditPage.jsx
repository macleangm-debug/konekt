import React from "react";
import { publicNavbarLinks } from "../../config/public-navbar-links";
import { adminSidebarLinks } from "../../config/admin-sidebar-links";
import { staffSidebarLinks } from "../../config/staff-sidebar-links";
import { partnerSidebarLinks } from "../../config/partner-sidebar-links";
import { customerSidebarLinks } from "../../config/customer-sidebar-links";

function LinkBlock({ title, items }) {
  return (
    <div className="rounded-[2rem] border bg-white p-6">
      <div className="text-2xl font-bold text-[#20364D]">{title}</div>
      <div className="space-y-3 mt-5">
        {items.map((item) => (
          <div key={item.href} className="rounded-xl bg-slate-50 px-4 py-3">
            <div className="font-semibold text-[#20364D]">{item.label}</div>
            <div className="text-sm text-slate-500 mt-1">{item.href}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NavigationAuditPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">Navigation Audit</div>
        <div className="text-slate-600 mt-2">
          Review all final links before controlled launch to ensure no important module is hidden.
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <LinkBlock title="Public Navbar" items={publicNavbarLinks} />
        <LinkBlock title="Customer Sidebar" items={customerSidebarLinks} />
        <LinkBlock title="Staff Sidebar" items={staffSidebarLinks} />
        <LinkBlock title="Partner Sidebar" items={partnerSidebarLinks} />
        <LinkBlock title="Admin Sidebar" items={adminSidebarLinks} />
      </div>
    </div>
  );
}
