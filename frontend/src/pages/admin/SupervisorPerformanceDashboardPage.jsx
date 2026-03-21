import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import { Loader2, TrendingUp, AlertTriangle, Users, Activity } from "lucide-react";

export default function SupervisorPerformanceDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get("/api/staff-performance/supervisor-overview");
        setOverview(res.data);
      } catch (err) {
        console.error("Failed to load supervisor overview:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="supervisor-loading">
        <Loader2 className="w-8 h-8 animate-spin text-[#20364D]" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="space-y-8">
        <PageHeader title="Supervisor Dashboard" subtitle="Performance overview for sales leadership." />
        <SurfaceCard className="text-center py-12">
          <p className="text-slate-500">Failed to load performance data. Please try again.</p>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="supervisor-performance-dashboard">
      <PageHeader
        title="Supervisor Performance Dashboard"
        subtitle="Monitor team performance, identify at-risk staff, and optimize workload distribution."
      />

      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SurfaceCard className="text-center">
          <Users className="w-8 h-8 mx-auto text-[#20364D] mb-3" />
          <div className="text-3xl font-bold text-[#20364D]">{overview.team_size}</div>
          <div className="text-slate-600 text-sm">Team Size</div>
        </SurfaceCard>
        <SurfaceCard className="text-center">
          <TrendingUp className="w-8 h-8 mx-auto text-[#D4A843] mb-3" />
          <div className="text-3xl font-bold text-[#20364D]">{overview.average_efficiency}</div>
          <div className="text-slate-600 text-sm">Avg Efficiency</div>
        </SurfaceCard>
        <SurfaceCard className={`text-center ${overview.at_risk_count > 0 ? "border-red-200 bg-red-50/50" : ""}`}>
          <AlertTriangle className={`w-8 h-8 mx-auto mb-3 ${overview.at_risk_count > 0 ? "text-red-500" : "text-slate-400"}`} />
          <div className={`text-3xl font-bold ${overview.at_risk_count > 0 ? "text-red-600" : "text-slate-600"}`}>
            {overview.at_risk_count}
          </div>
          <div className="text-slate-600 text-sm">At Risk ({"<"}50 eff.)</div>
        </SurfaceCard>
        <SurfaceCard className={`text-center ${overview.overloaded_count > 0 ? "border-amber-200 bg-amber-50/50" : ""}`}>
          <Activity className={`w-8 h-8 mx-auto mb-3 ${overview.overloaded_count > 0 ? "text-amber-500" : "text-slate-400"}`} />
          <div className={`text-3xl font-bold ${overview.overloaded_count > 0 ? "text-amber-600" : "text-slate-600"}`}>
            {overview.overloaded_count}
          </div>
          <div className="text-slate-600 text-sm">Overloaded ({">"}15 work)</div>
        </SurfaceCard>
      </div>

      {/* Top & Needs Attention */}
      <div className="grid lg:grid-cols-2 gap-6">
        {overview.top_performer && (
          <SurfaceCard className="border-emerald-200 bg-emerald-50/30">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">1</div>
              <div className="text-lg font-bold text-[#20364D]">Top Performer</div>
            </div>
            <div className="text-2xl font-bold text-[#20364D]">{overview.top_performer.sales_name}</div>
            <div className="text-sm text-slate-500 mb-4">{overview.top_performer.sales_email}</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white p-3 text-center">
                <div className="text-xl font-bold text-emerald-600">{overview.top_performer.efficiency_score}</div>
                <div className="text-xs text-slate-500">Efficiency</div>
              </div>
              <div className="rounded-xl bg-white p-3 text-center">
                <div className="text-xl font-bold text-emerald-600">{overview.top_performer.close_rate}%</div>
                <div className="text-xs text-slate-500">Close Rate</div>
              </div>
              <div className="rounded-xl bg-white p-3 text-center">
                <div className="text-xl font-bold text-slate-700">{overview.top_performer.won_opportunities}</div>
                <div className="text-xs text-slate-500">Wins</div>
              </div>
            </div>
          </SurfaceCard>
        )}

        {overview.needs_attention && (
          <SurfaceCard className="border-amber-200 bg-amber-50/30">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <div className="text-lg font-bold text-[#20364D]">Needs Attention</div>
            </div>
            <div className="text-2xl font-bold text-[#20364D]">{overview.needs_attention.sales_name}</div>
            <div className="text-sm text-slate-500 mb-4">{overview.needs_attention.sales_email}</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white p-3 text-center">
                <div className={`text-xl font-bold ${overview.needs_attention.efficiency_score < 50 ? "text-red-500" : "text-amber-600"}`}>
                  {overview.needs_attention.efficiency_score}
                </div>
                <div className="text-xs text-slate-500">Efficiency</div>
              </div>
              <div className="rounded-xl bg-white p-3 text-center">
                <div className="text-xl font-bold text-amber-600">{overview.needs_attention.close_rate}%</div>
                <div className="text-xs text-slate-500">Close Rate</div>
              </div>
              <div className="rounded-xl bg-white p-3 text-center">
                <div className="text-xl font-bold text-slate-700">{overview.needs_attention.open_workload}</div>
                <div className="text-xs text-slate-500">Workload</div>
              </div>
            </div>
          </SurfaceCard>
        )}
      </div>

      {/* At-Risk Staff */}
      {overview.at_risk_staff && overview.at_risk_staff.length > 0 && (
        <SurfaceCard>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div className="text-lg font-bold text-[#20364D]">At-Risk Staff (Efficiency {"<"} 50)</div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overview.at_risk_staff.map(person => (
              <div key={person.sales_user_id} className="rounded-2xl border border-red-200 bg-red-50/50 p-4">
                <div className="font-bold text-[#20364D]">{person.sales_name}</div>
                <div className="text-sm text-slate-500">{person.sales_email}</div>
                <div className="flex gap-3 mt-3">
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-500">{person.efficiency_score}</div>
                    <div className="text-xs text-slate-500">Efficiency</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-slate-600">{person.close_rate}%</div>
                    <div className="text-xs text-slate-500">Close Rate</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      )}

      {/* Overloaded Staff */}
      {overview.overloaded_staff && overview.overloaded_staff.length > 0 && (
        <SurfaceCard>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-amber-500" />
            <div className="text-lg font-bold text-[#20364D]">Overloaded Staff (Workload {">"} 15)</div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overview.overloaded_staff.map(person => (
              <div key={person.sales_user_id} className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                <div className="font-bold text-[#20364D]">{person.sales_name}</div>
                <div className="text-sm text-slate-500">{person.sales_email}</div>
                <div className="flex gap-3 mt-3">
                  <div className="text-center">
                    <div className="text-lg font-bold text-amber-600">{person.open_workload}</div>
                    <div className="text-xs text-slate-500">Workload</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-slate-600">{person.efficiency_score}</div>
                    <div className="text-xs text-slate-500">Efficiency</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      )}

      {/* Full Leaderboard */}
      <SurfaceCard>
        <div className="text-lg font-bold text-[#20364D] mb-4">Full Team Leaderboard</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-slate-500 border-b">
                <th className="pb-3 font-medium">Rank</th>
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium text-center">Efficiency</th>
                <th className="pb-3 font-medium text-center">Close Rate</th>
                <th className="pb-3 font-medium text-center">Response</th>
                <th className="pb-3 font-medium text-center">Rating</th>
                <th className="pb-3 font-medium text-center">Workload</th>
                <th className="pb-3 font-medium text-center">Won</th>
              </tr>
            </thead>
            <tbody>
              {(overview.leaderboard || []).map((person, index) => (
                <tr key={person.sales_user_id} className="border-b hover:bg-slate-50">
                  <td className="py-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? "bg-[#D4A843] text-white" :
                      index === 1 ? "bg-slate-400 text-white" :
                      index === 2 ? "bg-amber-600 text-white" :
                      "bg-slate-200 text-slate-700"
                    }`}>
                      {index + 1}
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="font-semibold text-[#20364D]">{person.sales_name}</div>
                    <div className="text-xs text-slate-500">{person.sales_email}</div>
                  </td>
                  <td className="py-3 text-center">
                    <span className={`font-semibold ${
                      person.efficiency_score >= 70 ? "text-emerald-600" :
                      person.efficiency_score >= 50 ? "text-[#D4A843]" :
                      "text-red-500"
                    }`}>
                      {person.efficiency_score}
                    </span>
                  </td>
                  <td className="py-3 text-center">{person.close_rate}%</td>
                  <td className="py-3 text-center">{person.response_speed_score}</td>
                  <td className="py-3 text-center">{person.customer_rating_score}</td>
                  <td className="py-3 text-center">
                    <span className={person.open_workload > 15 ? "text-amber-600 font-semibold" : ""}>
                      {person.open_workload}
                    </span>
                  </td>
                  <td className="py-3 text-center">{person.won_opportunities}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  );
}
