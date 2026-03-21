import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";

export default function SupervisorPerformanceDashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/api/staff-performance/supervisor-overview").then((res) => setData(res.data));
  }, []);

  if (!data) return <div className="p-10">Loading supervisor dashboard...</div>;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Supervisor Performance Dashboard"
        subtitle="Track team efficiency, underperformance risk, and workload pressure."
      />

      <div className="grid md:grid-cols-4 gap-5">
        <SurfaceCard><div className="text-sm text-slate-500">Team Size</div><div className="text-3xl font-bold text-[#20364D] mt-2">{data.team_size}</div></SurfaceCard>
        <SurfaceCard><div className="text-sm text-slate-500">Average Efficiency</div><div className="text-3xl font-bold text-[#20364D] mt-2">{data.average_efficiency}</div></SurfaceCard>
        <SurfaceCard><div className="text-sm text-slate-500">At-Risk Staff</div><div className="text-3xl font-bold text-[#20364D] mt-2">{data.at_risk_count}</div></SurfaceCard>
        <SurfaceCard><div className="text-sm text-slate-500">Overloaded Staff</div><div className="text-3xl font-bold text-[#20364D] mt-2">{data.overloaded_count}</div></SurfaceCard>
      </div>

      <SurfaceCard>
        <div className="text-2xl font-bold text-[#20364D]">Team Leaderboard</div>
        <div className="space-y-4 mt-6">
          {data.leaderboard.map((row, idx) => (
            <div key={row.sales_user_id} className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-[#20364D]">{idx + 1}. {row.sales_name}</div>
                  <div className="text-sm text-slate-500 mt-1">
                    Close Rate: {row.close_rate}% • Workload: {row.open_workload}
                  </div>
                </div>
                <div className="text-xl font-bold text-[#20364D]">{row.efficiency_score}</div>
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
