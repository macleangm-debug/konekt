import React from "react";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import AdminQuickActionGrid from "../../components/admin/AdminQuickActionGrid";

export default function AdminUxOverviewPage() {
  return (
    <div className="space-y-8" data-testid="admin-ux-overview-page">
      <PageHeader
        title="Admin UX Overview"
        subtitle="A cleaner command surface for daily operations, configuration, and launch control."
      />

      <AdminQuickActionGrid />

      <div className="grid xl:grid-cols-[1fr_1fr] gap-6">
        <SurfaceCard>
          <div className="text-2xl font-bold text-[#20364D]">What changed</div>
          <div className="space-y-3 mt-5 text-slate-700">
            <div className="rounded-2xl border bg-slate-50 px-4 py-3">
              Operations and configuration are separated more clearly.
            </div>
            <div className="rounded-2xl border bg-slate-50 px-4 py-3">
              High-value quick actions are easier to see from the admin surface.
            </div>
            <div className="rounded-2xl border bg-slate-50 px-4 py-3">
              Launch-critical areas such as payment settings and runtime status should be harder to miss.
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="text-2xl font-bold text-[#20364D]">Next UI refinements</div>
          <div className="space-y-3 mt-5 text-slate-700">
            <div className="rounded-2xl border bg-slate-50 px-4 py-3">
              Add stronger empty states across remaining admin tables.
            </div>
            <div className="rounded-2xl border bg-slate-50 px-4 py-3">
              Tighten spacing and card hierarchy on analytics-heavy pages.
            </div>
            <div className="rounded-2xl border bg-slate-50 px-4 py-3">
              Keep verification and configuration actions visible in the admin header.
            </div>
          </div>
        </SurfaceCard>
      </div>

      {/* System Status Overview */}
      <SurfaceCard>
        <div className="text-2xl font-bold text-[#20364D] mb-6">System Status</div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border p-4">
            <div className="text-sm text-slate-500 mb-1">Payment Gateway</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="font-semibold text-[#20364D]">Bank Transfer Active</span>
            </div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-sm text-slate-500 mb-1">Email Service</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span className="font-semibold text-[#20364D]">Pending Config</span>
            </div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-sm text-slate-500 mb-1">Notifications</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="font-semibold text-[#20364D]">Active</span>
            </div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-sm text-slate-500 mb-1">Partner Network</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="font-semibold text-[#20364D]">Connected</span>
            </div>
          </div>
        </div>
      </SurfaceCard>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SurfaceCard className="text-center">
          <div className="text-4xl font-bold text-[#20364D]">12</div>
          <div className="text-slate-600 mt-1">Pending Quotes</div>
        </SurfaceCard>
        <SurfaceCard className="text-center">
          <div className="text-4xl font-bold text-[#D4A843]">5</div>
          <div className="text-slate-600 mt-1">Orders in Production</div>
        </SurfaceCard>
        <SurfaceCard className="text-center">
          <div className="text-4xl font-bold text-[#20364D]">3</div>
          <div className="text-slate-600 mt-1">Unpaid Invoices</div>
        </SurfaceCard>
        <SurfaceCard className="text-center">
          <div className="text-4xl font-bold text-green-600">8</div>
          <div className="text-slate-600 mt-1">Completed Today</div>
        </SurfaceCard>
      </div>
    </div>
  );
}
