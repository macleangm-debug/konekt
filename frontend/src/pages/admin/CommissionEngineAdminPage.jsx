import React from "react";
import PageHeader from "../../components/ui/PageHeader";

export default function CommissionEngineAdminPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Unified Commission Engine"
        subtitle="Manage affiliate and sales commissions from one controlled logic layer."
      />

      <div className="rounded-[2rem] border bg-white p-8">
        <div className="text-2xl font-bold text-[#20364D]">Control goals</div>
        <ul className="space-y-3 mt-5 text-slate-700">
          <li className="rounded-2xl bg-slate-50 px-4 py-3">Protect minimum company markup first</li>
          <li className="rounded-2xl bg-slate-50 px-4 py-3">Generate commission only after payment approval</li>
          <li className="rounded-2xl bg-slate-50 px-4 py-3">Track affiliate and sales commission in one ledger</li>
          <li className="rounded-2xl bg-slate-50 px-4 py-3">Prevent over-allocation beyond the distribution layer</li>
        </ul>
      </div>
    </div>
  );
}
