import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { Users, TrendingUp, Target, DollarSign } from "lucide-react";
import safeDisplay from "@/utils/safeDisplay";

export default function TeamOverviewPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/supervisor-team/staff-list");
        const list = res.data?.staff || res.data || [];
        setStaff(Array.isArray(list) ? list : []);
      } catch { setStaff([]); }
      setLoading(false);
    })();
  }, []);

  const salesStaff = staff.filter((s) => s.role === "sales");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6" data-testid="team-overview-page">
      <div>
        <h1 className="text-xl font-bold text-[#20364D]">Team Overview</h1>
        <p className="text-sm text-slate-500 mt-0.5">Sales team performance summary</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Sales Members" value={salesStaff.length} />
        <KpiCard icon={Target} label="Active Leads" value={salesStaff.reduce((a, s) => a + (s.active_leads || 0), 0)} />
        <KpiCard icon={TrendingUp} label="Deals Closed" value={salesStaff.reduce((a, s) => a + (s.deals_closed || 0), 0)} />
        <KpiCard icon={DollarSign} label="Total Revenue" value={`TZS ${salesStaff.reduce((a, s) => a + (s.revenue || 0), 0).toLocaleString()}`} />
      </div>

      {/* Team Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading team data...</div>
      ) : salesStaff.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-xl" data-testid="team-empty">
          <Users className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-500">No sales team members yet</p>
          <p className="text-xs text-slate-400 mt-1">Data will appear when sales team members are added to the system</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="team-table">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Email</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase">Active Leads</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase">Deals Closed</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salesStaff.map((s, i) => (
                <tr key={s.id || i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-[#20364D]">{safeDisplay(s.name || s.full_name)}</td>
                  <td className="px-4 py-3 text-slate-500">{safeDisplay(s.email)}</td>
                  <td className="px-4 py-3 text-right">{s.active_leads || 0}</td>
                  <td className="px-4 py-3 text-right">{s.deals_closed || 0}</td>
                  <td className="px-4 py-3 text-right font-semibold">TZS {(s.revenue || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold uppercase mb-2">
        <Icon className="w-4 h-4" /> {label}
      </div>
      <div className="text-2xl font-bold text-[#20364D]">{value}</div>
    </div>
  );
}
