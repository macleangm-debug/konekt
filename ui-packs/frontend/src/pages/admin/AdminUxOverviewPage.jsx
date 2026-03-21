import React from "react";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import AdminQuickActionGrid from "../../components/admin/AdminQuickActionGrid";

export default function AdminUxOverviewPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin UX Overview"
        subtitle="A cleaner command surface for daily operations, configuration, and launch control."
      />

      <AdminQuickActionGrid />

      <div className="grid xl:grid-cols-[1fr_1fr] gap-6">
        <SurfaceCard>
          <div className="text-2xl font-bold text-[#20364D]">What changed</div>
          <div className="space-y-3 mt-5 text-slate-700">
            <div className="rounded-2xl border bg-slate-50 px-4 py-3">Operations and configuration are separated more clearly.</div>
            <div className="rounded-2xl border bg-slate-50 px-4 py-3">High-value quick actions are easier to see from the admin surface.</div>
            <div className="rounded-2xl border bg-slate-50 px-4 py-3">Launch-critical areas such as payment settings and runtime status should be harder to miss.</div>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="text-2xl font-bold text-[#20364D]">Next UI refinements</div>
          <div className="space-y-3 mt-5 text-slate-700">
            <div className="rounded-2xl border bg-slate-50 px-4 py-3">Add stronger empty states across remaining admin tables.</div>
            <div className="rounded-2xl border bg-slate-50 px-4 py-3">Tighten spacing and card hierarchy on analytics-heavy pages.</div>
            <div className="rounded-2xl border bg-slate-50 px-4 py-3">Keep verification and configuration actions visible in the admin header.</div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
