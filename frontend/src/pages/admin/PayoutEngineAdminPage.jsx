import React from "react";
import PageHeader from "../../components/ui/PageHeader";

export default function PayoutEngineAdminPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Payout Engine"
        subtitle="Control thresholds, payout cycles, approvals, and outgoing commission cash flow."
      />

      <div className="rounded-[2rem] border bg-white p-8">
        <div className="text-2xl font-bold text-[#20364D]">Recommended rules</div>
        <ul className="space-y-3 mt-5 text-slate-700">
          <li className="rounded-2xl bg-slate-50 px-4 py-3">Minimum payout threshold: 50,000 TZS or higher</li>
          <li className="rounded-2xl bg-slate-50 px-4 py-3">Payout cycle: monthly</li>
          <li className="rounded-2xl bg-slate-50 px-4 py-3">Only approved commissions are eligible for payout</li>
          <li className="rounded-2xl bg-slate-50 px-4 py-3">Admin approval before funds are released</li>
        </ul>
      </div>
    </div>
  );
}
