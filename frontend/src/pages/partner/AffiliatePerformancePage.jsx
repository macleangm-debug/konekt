import React, { useEffect, useState } from "react";
import api from "../../lib/api";

export default function AffiliatePerformancePage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/api/affiliate-performance/me").then((res) => setData(res.data));
  }, []);

  if (!data) return <div className="p-10">Loading affiliate performance...</div>;

  return (
    <div className="space-y-8">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">My Performance</div>
        <div className="text-slate-600 mt-2">Track clicks, leads, conversions, and your current affiliate status.</div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-6 gap-4">
        <div className="rounded-[2rem] border bg-white p-5"><div className="text-sm text-slate-500">Clicks</div><div className="text-3xl font-bold text-[#20364D] mt-3">{data.clicks}</div></div>
        <div className="rounded-[2rem] border bg-white p-5"><div className="text-sm text-slate-500">Leads</div><div className="text-3xl font-bold text-[#20364D] mt-3">{data.leads}</div></div>
        <div className="rounded-[2rem] border bg-white p-5"><div className="text-sm text-slate-500">Sales</div><div className="text-3xl font-bold text-[#20364D] mt-3">{data.sales}</div></div>
        <div className="rounded-[2rem] border bg-white p-5"><div className="text-sm text-slate-500">Commission</div><div className="text-3xl font-bold text-[#20364D] mt-3">{data.total_commission}</div></div>
        <div className="rounded-[2rem] border bg-white p-5"><div className="text-sm text-slate-500">Conversion Rate</div><div className="text-3xl font-bold text-[#20364D] mt-3">{data.conversion_rate}%</div></div>
        <div className="rounded-[2rem] border bg-white p-5"><div className="text-sm text-slate-500">Status</div><div className="text-3xl font-bold text-[#20364D] mt-3">{data.status}</div></div>
      </div>

      <div className="rounded-[2rem] border bg-white p-8">
        <div className="text-2xl font-bold text-[#20364D]">Suggested Personal Promo Code</div>
        <div className="text-slate-700 mt-4 text-xl font-semibold">{data.promo_code_recommended}</div>
      </div>
    </div>
  );
}
