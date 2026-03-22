import React from "react";

export default function AffiliatePayoutSummaryCard({ payout }) {
  return (
    <div className="rounded-[2rem] border bg-white p-8">
      <div className="text-2xl font-bold text-[#20364D]">Payout Summary</div>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-sm text-slate-500">Pending</div>
          <div className="text-2xl font-bold text-[#20364D] mt-2">{payout.pending}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-sm text-slate-500">Paid</div>
          <div className="text-2xl font-bold text-[#20364D] mt-2">{payout.paid}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-sm text-slate-500">Next Payout Cycle</div>
          <div className="text-2xl font-bold text-[#20364D] mt-2">{payout.next_cycle}</div>
        </div>
      </div>

      <div className="rounded-2xl border bg-slate-50 p-4 mt-6">
        <div className="text-sm text-slate-500">Payout Account</div>
        <div className="font-semibold text-[#20364D] mt-2">{payout.account_name}</div>
        <div className="text-slate-600 mt-1">{payout.account_reference}</div>
      </div>
    </div>
  );
}
