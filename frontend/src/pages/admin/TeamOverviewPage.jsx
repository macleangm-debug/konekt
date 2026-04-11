import React, { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Users, TrendingUp, Target, DollarSign, Star, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TeamOverviewPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/team-performance/summary");
      setData(res.data);
    } catch { setData(null); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpis = data?.kpis || {};
  const reps = data?.reps || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5" data-testid="team-overview-page">
      <div>
        <h1 className="text-xl font-bold text-[#20364D]">Team Overview</h1>
        <p className="text-sm text-slate-500 mt-0.5">Sales team performance summary</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3" data-testid="team-kpis">
            <KpiCard icon={DollarSign} label="Total Revenue" value={`TZS ${(kpis.total_revenue || 0).toLocaleString()}`} />
            <KpiCard icon={Target} label="Deals Closed" value={kpis.deals_closed || 0} />
            <KpiCard icon={Users} label="Active Leads" value={kpis.active_leads || 0} />
            <KpiCard icon={TrendingUp} label="Conversion Rate" value={`${kpis.conversion_rate || 0}%`} />
            <KpiCard icon={Star} label="Avg Rating" value={kpis.avg_rating || "—"} />
            <KpiCard icon={AlertTriangle} label="Overdue Follow-Ups" value={kpis.overdue_followups || 0} severity={kpis.overdue_followups > 5 ? "critical" : kpis.overdue_followups > 0 ? "warning" : "ok"} />
          </div>

          {/* Team Table */}
          {reps.length === 0 ? (
            <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-xl" data-testid="team-empty">
              <Users className="w-12 h-12 mx-auto text-slate-200 mb-3" />
              <p className="text-sm font-semibold text-slate-500">No sales team members yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="team-table">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Rep</th>
                      <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Leads</th>
                      <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Quotes</th>
                      <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Deals Won</th>
                      <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Revenue</th>
                      <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Conv %</th>
                      <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Rating</th>
                      <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Overdue</th>
                      <th className="text-center px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reps.map((r) => (
                      <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`team-row-${r.id}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-[#20364D]">{r.name}</div>
                          <div className="text-[10px] text-slate-400">{r.email}</div>
                        </td>
                        <td className="px-3 py-3 text-right text-slate-600">{r.active_leads}</td>
                        <td className="px-3 py-3 text-right text-slate-600">{r.quotes_sent}</td>
                        <td className="px-3 py-3 text-right font-semibold text-[#20364D]">{r.deals_won}</td>
                        <td className="px-3 py-3 text-right font-semibold text-[#20364D]">TZS {(r.revenue || 0).toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-slate-600">{r.conversion_rate}%</td>
                        <td className="px-3 py-3 text-right">
                          {r.avg_rating > 0 ? <span className="text-amber-600 font-semibold">{r.avg_rating}</span> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {r.overdue_followups > 0 ? (
                            <span className="text-red-600 font-semibold">{r.overdue_followups}</span>
                          ) : (
                            <span className="text-emerald-500 text-xs">Clear</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Badge className={`text-[10px] ${
                            r.label === "Top Performer" ? "bg-emerald-100 text-emerald-700" :
                            r.label === "Strong" ? "bg-blue-100 text-blue-700" :
                            r.label === "Improving" ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          } hover:opacity-90`}>
                            {r.label}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 text-xs text-slate-400 border-t border-slate-100">
                {reps.length} team member{reps.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, severity }) {
  const borderColor = severity === "critical" ? "border-red-300" : severity === "warning" ? "border-amber-300" : "border-slate-200";
  return (
    <div className={`bg-white rounded-xl border ${borderColor} p-4`} data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase mb-1.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className={`text-lg font-bold ${severity === "critical" ? "text-red-600" : severity === "warning" ? "text-amber-600" : "text-[#20364D]"}`}>{value}</div>
    </div>
  );
}
