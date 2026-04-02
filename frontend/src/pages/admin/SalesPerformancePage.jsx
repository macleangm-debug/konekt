import React, { useEffect, useState, useCallback } from "react";
import { Users, Search, TrendingUp, Award } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import PerformanceCell from "@/components/performance/PerformanceCell";
import PerformanceBreakdownDrawer from "@/components/performance/PerformanceBreakdownDrawer";
import StandardSummaryCardsRow from "@/components/lists/StandardSummaryCardsRow";
import FilterBar from "@/components/admin/shared/FilterBar";

export default function SalesPerformancePage() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [drawerData, setDrawerData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSalesTeamPerformance();
      setTeam(res.data?.team || []);
    } catch { setTeam([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openBreakdown = async (userId) => {
    try {
      const res = await adminApi.getSalesDetail(userId);
      setDrawerData(res.data);
    } catch {}
  };

  const stats = {
    total: team.length,
    excellent: team.filter(t => t.performance_zone === "excellent").length,
    safe: team.filter(t => t.performance_zone === "safe").length,
    risk: team.filter(t => t.performance_zone === "risk").length,
    developing: team.filter(t => t.performance_zone === "developing").length,
  };

  const filtered = team.filter(t => {
    if (search && !t.name?.toLowerCase().includes(search.toLowerCase()) && !t.email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (zoneFilter && t.performance_zone !== zoneFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6" data-testid="sales-performance-page">
      <div>
        <h1 className="text-2xl font-bold text-[#20364D]">Sales Performance</h1>
        <p className="mt-0.5 text-sm text-slate-500">Team scores, breakdowns, and assignment readiness.</p>
      </div>

      <StandardSummaryCardsRow
        columns={5}
        cards={[
          { label: "Total", value: stats.total, icon: Users, accent: "slate", onClick: () => setZoneFilter(""), active: !zoneFilter },
          { label: "Excellent", value: stats.excellent, icon: Award, accent: "emerald", onClick: () => setZoneFilter("excellent"), active: zoneFilter === "excellent" },
          { label: "Safe", value: stats.safe, icon: TrendingUp, accent: "blue", onClick: () => setZoneFilter("safe"), active: zoneFilter === "safe" },
          { label: "Risk", value: stats.risk, icon: TrendingUp, accent: "red", onClick: () => setZoneFilter("risk"), active: zoneFilter === "risk" },
          { label: "Developing", value: stats.developing, icon: TrendingUp, accent: "amber", onClick: () => setZoneFilter("developing"), active: zoneFilter === "developing" },
        ]}
      />

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <FilterBar search={search} onSearchChange={setSearch} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="sales-performance-table">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Name</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Email</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Performance</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Zone</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Data Points</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No sales team members found.</td></tr>
              ) : filtered.map((m) => (
                <tr key={m.user_id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors" data-testid={`sales-row-${m.user_id}`}>
                  <td className="px-4 py-3 font-medium text-[#20364D]">{m.name || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{m.email || "—"}</td>
                  <td className="px-4 py-3">
                    <PerformanceCell score={m.performance_score} zone={m.performance_zone} onClick={() => openBreakdown(m.user_id)} />
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">{m.performance_zone}</td>
                  <td className="px-4 py-3 text-slate-500">{m.sample_size}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {m.status || "active"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PerformanceBreakdownDrawer open={!!drawerData} onClose={() => setDrawerData(null)} data={drawerData} />
    </div>
  );
}
