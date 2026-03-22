import React, { useEffect, useState } from "react";
import api from "../../lib/api";

export default function AffiliatePerformanceGovernancePage() {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    api.get("/api/affiliate-performance/leaderboard").then((res) => setLeaders(res.data || []));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">Affiliate Performance & Code Governance</div>
        <div className="text-slate-600 mt-2">
          Track top performers, identify non-performers, and manage personal promo code-driven growth.
        </div>
      </div>

      <div className="rounded-[2rem] border bg-white p-8">
        <div className="text-2xl font-bold text-[#20364D]">Top Performers</div>
        <div className="space-y-4 mt-6">
          {leaders.map((row, idx) => (
            <div key={idx} className="rounded-2xl border bg-slate-50 p-4">
              <div className="font-semibold text-[#20364D]">Affiliate {row._id}</div>
              <div className="text-sm text-slate-500 mt-1">Sales: {row.sales} • Commission: {row.total_commission}</div>
            </div>
          ))}
          {!leaders.length ? <div className="text-slate-600">No affiliate data yet.</div> : null}
        </div>
      </div>

      <div className="rounded-[2rem] border bg-white p-8">
        <ul className="space-y-3 text-slate-700">
          <li className="rounded-2xl bg-slate-50 px-4 py-3">Affiliates can use personal promo codes like MIKE.</li>
          <li className="rounded-2xl bg-slate-50 px-4 py-3">Non-performers can be placed on watchlist before pause.</li>
          <li className="rounded-2xl bg-slate-50 px-4 py-3">Affiliates should only see masked sales details.</li>
        </ul>
      </div>
    </div>
  );
}
