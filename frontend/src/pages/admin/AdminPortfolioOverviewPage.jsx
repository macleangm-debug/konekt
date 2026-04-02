import React, { useEffect, useState, useCallback } from "react";
import { Building2, User, Users, BarChart3, TrendingUp, AlertTriangle } from "lucide-react";
import { adminApi } from "@/lib/adminApi";

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
        <Icon className="h-5 w-5 text-slate-600" />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-[#20364D]">{value}</div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      </div>
    </div>
  );
}

export default function AdminPortfolioOverviewPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAdminPortfolioOverview();
      setData(res.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-5" data-testid="admin-portfolio-loading">
        <div><h1 className="text-2xl font-bold text-[#20364D]">Portfolio Overview</h1></div>
        <div className="py-16 text-center text-sm text-slate-400">Loading...</div>
      </div>
    );
  }

  const owners = data?.owners || [];
  const totalClients = owners.reduce((s, o) => s + o.total_clients, 0);
  const totalPending = owners.reduce((s, o) => s + o.pending_tasks, 0);
  const avgReactivation = owners.length > 0 ? Math.round(owners.reduce((s, o) => s + o.reactivation_rate, 0) / owners.length) : 0;

  return (
    <div className="space-y-5" data-testid="admin-portfolio-overview-page">
      <div>
        <h1 className="text-2xl font-bold text-[#20364D]">Portfolio Overview</h1>
        <p className="mt-0.5 text-sm text-slate-500">Client portfolio distribution and reactivation metrics across all sales owners.</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="admin-portfolio-stats">
        <StatCard label="Total Clients" value={totalClients} icon={Building2} />
        <StatCard label="Sales Owners" value={owners.length} icon={Users} />
        <StatCard label="Pending Tasks" value={totalPending} icon={AlertTriangle} />
        <StatCard label="Avg Reactivation" value={`${avgReactivation}%`} icon={TrendingUp} />
      </div>

      {/* Owner Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid="owner-portfolio-table">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Portfolio by Owner</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-left">
                <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Owner</th>
                <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Companies</th>
                <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Individuals</th>
                <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Total</th>
                <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Pending Tasks</th>
                <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Completed</th>
                <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Reactivation %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {owners.map((owner) => (
                <tr key={owner.sales_id} className="hover:bg-slate-50/50 transition-colors" data-testid={`owner-row-${owner.sales_id}`}>
                  <td className="px-5 py-3">
                    <span className="font-semibold text-[#20364D]">{owner.sales_name}</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                      <Building2 className="h-3.5 w-3.5 text-blue-400" /> {owner.companies}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                      <User className="h-3.5 w-3.5 text-emerald-400" /> {owner.individuals}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center font-semibold text-[#20364D]">{owner.total_clients}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-sm font-medium ${owner.pending_tasks > 0 ? "text-amber-600" : "text-slate-400"}`}>
                      {owner.pending_tasks}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center text-sm text-slate-600">{owner.completed_tasks}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-sm font-semibold ${owner.reactivation_rate >= 50 ? "text-emerald-600" : owner.reactivation_rate > 0 ? "text-amber-600" : "text-slate-400"}`}>
                      {owner.reactivation_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
