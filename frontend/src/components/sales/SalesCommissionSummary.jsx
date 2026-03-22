import React from "react";

export default function SalesCommissionSummary({ metrics }) {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
      <div className="rounded-[2rem] border bg-white p-5"><div className="text-sm text-slate-500">Assigned Opportunities</div><div className="text-3xl font-bold text-[#20364D] mt-3">{metrics.assigned}</div></div>
      <div className="rounded-[2rem] border bg-white p-5"><div className="text-sm text-slate-500">Closed Deals</div><div className="text-3xl font-bold text-[#20364D] mt-3">{metrics.closed}</div></div>
      <div className="rounded-[2rem] border bg-white p-5"><div className="text-sm text-slate-500">Commission Earned</div><div className="text-3xl font-bold text-[#20364D] mt-3">{metrics.earned}</div></div>
      <div className="rounded-[2rem] border bg-white p-5"><div className="text-sm text-slate-500">Pending Payout</div><div className="text-3xl font-bold text-[#20364D] mt-3">{metrics.pending}</div></div>
      <div className="rounded-[2rem] border bg-white p-5"><div className="text-sm text-slate-500">Conversion Rate</div><div className="text-3xl font-bold text-[#20364D] mt-3">{metrics.conversion}</div></div>
    </div>
  );
}
