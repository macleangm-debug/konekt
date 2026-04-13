import React, { useEffect, useState } from "react";
import { TrendingUp, Users, Target, AlertTriangle, Lightbulb, BarChart3 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const fmt = (v) => `TZS ${Number(v || 0).toLocaleString("en-US")}`;
const fmtNum = (v) => Number(v || 0).toLocaleString("en-US");
const pct = (v) => `${Number(v || 0).toFixed(1)}%`;

const statusColors = {
  top: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  underperform: "bg-red-100 text-red-700",
};
const statusLabels = { top: "Top", warning: "Warning", underperform: "Below" };

function KpiCard({ label, value, subtitle, color }) {
  return (
    <div className="bg-white rounded-2xl border p-5" data-testid={`kpi-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</div>
      <div className={`text-2xl font-extrabold mt-1 ${color || "text-[#20364D]"}`}>{value}</div>
      {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
    </div>
  );
}

function ChannelBar({ channels }) {
  const total = Object.values(channels).reduce((s, c) => s + c.revenue, 0);
  if (total === 0) return null;
  const colors = { sales: "bg-[#20364D]", affiliate: "bg-[#D4A843]", direct: "bg-blue-500", group_deal: "bg-green-500" };

  return (
    <div className="bg-white rounded-2xl border p-5" data-testid="channel-bar">
      <div className="text-sm font-bold text-[#20364D] mb-3">Channel Split</div>
      <div className="h-4 rounded-full overflow-hidden flex bg-slate-100">
        {Object.entries(channels).map(([key, ch]) => {
          const w = (ch.revenue / total) * 100;
          if (w < 1) return null;
          return <div key={key} className={`h-full ${colors[key] || "bg-slate-400"}`} style={{ width: `${w}%` }} title={`${ch.label}: ${pct(ch.contribution_pct)}`} />;
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        {Object.entries(channels).map(([key, ch]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs">
            <div className={`w-2.5 h-2.5 rounded-full ${colors[key] || "bg-slate-400"}`} />
            <span className="text-slate-600">{ch.label}: {pct(ch.contribution_pct)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChannelCards({ channels }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="channel-cards">
      {Object.entries(channels).map(([key, ch]) => (
        <div key={key} className="bg-white rounded-2xl border p-4">
          <div className="text-xs text-slate-500 font-medium">{ch.label}</div>
          <div className="text-lg font-extrabold text-[#20364D] mt-1">{fmt(ch.revenue)}</div>
          <div className="text-xs text-slate-500">Profit: {fmt(ch.profit)}</div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${ch.achievement_pct >= 100 ? "bg-green-500" : ch.achievement_pct >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                style={{ width: `${Math.min(ch.achievement_pct, 100)}%` }} />
            </div>
            <span className="text-xs font-semibold text-slate-600">{pct(ch.achievement_pct)}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">{ch.deal_count} deals &middot; Target: {fmt(ch.target)}</div>
        </div>
      ))}
    </div>
  );
}

export default function PerformanceDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const loadData = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/api/admin/performance/dashboard?year=${year}&month=${month}`);
      setData(r.data);
    } catch (err) {
      toast.error("Failed to load performance data");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [year, month]);

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  if (loading) return <div className="p-6 text-center text-slate-500">Loading performance data...</div>;
  if (!data) return <div className="p-6 text-center text-slate-500">No data available.</div>;

  const { kpi_strip: kpi, channels, sales_leaderboard, affiliate_leaderboard, actions } = data;

  return (
    <div className="p-6 space-y-6 max-w-7xl" data-testid="performance-dashboard">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#20364D]">Performance Dashboard</h1>
          <p className="text-sm text-slate-500">Monthly KPIs, channel performance, and team leaderboards</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border rounded-xl px-3 py-2 text-sm bg-white" data-testid="month-filter">
            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border rounded-xl px-3 py-2 text-sm bg-white" data-testid="year-filter">
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Total Profit" value={fmt(kpi.total_profit)} subtitle={`Target: ${fmt(kpi.target_profit)}`}
          color={kpi.achievement_pct >= 100 ? "text-green-600" : kpi.achievement_pct >= 60 ? "text-amber-600" : "text-red-600"} />
        <KpiCard label="Achievement" value={pct(kpi.achievement_pct)} subtitle={`Revenue: ${fmt(kpi.total_revenue)}`}
          color={kpi.achievement_pct >= 100 ? "text-green-600" : kpi.achievement_pct >= 60 ? "text-amber-600" : "text-red-600"} />
        <KpiCard label="Revenue" value={fmt(kpi.total_revenue)} subtitle={`Target: ${fmt(kpi.target_revenue)}`} />
        <KpiCard label="Active Sales" value={kpi.active_sales} subtitle="staff members" />
        <KpiCard label="Active Affiliates" value={kpi.active_affiliates} subtitle="partners" />
      </div>

      {/* Channel Performance */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-[#20364D] flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Channel Performance</h2>
        <ChannelBar channels={channels} />
        <ChannelCards channels={channels} />
      </div>

      {/* Sales Leaderboard (profit-first) */}
      <div>
        <h2 className="text-base font-bold text-[#20364D] flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4" /> Sales Performance</h2>
        {sales_leaderboard.length === 0 ? (
          <div className="bg-white rounded-2xl border p-6 text-center text-slate-400">No sales staff found.</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-2xl border bg-white overflow-hidden" data-testid="sales-table">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wide">
                  <tr>
                    <th className="px-5 py-3 text-left">Name</th>
                    <th className="px-5 py-3 text-left">Profit</th>
                    <th className="px-5 py-3 text-left">Target</th>
                    <th className="px-5 py-3 text-left">%</th>
                    <th className="px-5 py-3 text-left">Revenue</th>
                    <th className="px-5 py-3 text-left">Deals</th>
                    <th className="px-5 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sales_leaderboard.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70" data-testid={`sales-row-${s.id}`}>
                      <td className="px-5 py-3 font-semibold text-[#20364D]">{s.name}</td>
                      <td className="px-5 py-3 font-bold text-[#D4A843]">{fmt(s.profit)}</td>
                      <td className="px-5 py-3 text-slate-500">{fmt(s.target_profit)}</td>
                      <td className="px-5 py-3 font-bold">{pct(s.achievement_pct)}</td>
                      <td className="px-5 py-3 text-slate-600">{fmt(s.revenue)}</td>
                      <td className="px-5 py-3">{s.deals}</td>
                      <td className="px-5 py-3"><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[s.status]}`}>{statusLabels[s.status]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="md:hidden space-y-2" data-testid="sales-mobile-cards">
              {sales_leaderboard.map((s) => (
                <div key={s.id} className="bg-white rounded-2xl border p-4" data-testid={`sales-card-${s.id}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-[#20364D] text-sm">{s.name}</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[s.status]}`}>{statusLabels[s.status]}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-400">Profit</span><div className="font-bold text-[#D4A843]">{fmt(s.profit)}</div></div>
                    <div><span className="text-slate-400">Achievement</span><div className="font-bold">{pct(s.achievement_pct)}</div></div>
                    <div><span className="text-slate-400">Revenue</span><div className="font-bold">{fmt(s.revenue)}</div></div>
                    <div><span className="text-slate-400">Deals</span><div className="font-bold">{s.deals}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Affiliate Leaderboard (earnings-only) */}
      <div>
        <h2 className="text-base font-bold text-[#20364D] flex items-center gap-2 mb-3"><Users className="w-4 h-4" /> Affiliate Performance</h2>
        {affiliate_leaderboard.length === 0 ? (
          <div className="bg-white rounded-2xl border p-6 text-center text-slate-400">No affiliates found.</div>
        ) : (
          <>
            <div className="hidden md:block rounded-2xl border bg-white overflow-hidden" data-testid="affiliate-table">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wide">
                  <tr>
                    <th className="px-5 py-3 text-left">Name</th>
                    <th className="px-5 py-3 text-left">Earnings</th>
                    <th className="px-5 py-3 text-left">Deals</th>
                    <th className="px-5 py-3 text-left">Conversions</th>
                    <th className="px-5 py-3 text-left">%</th>
                    <th className="px-5 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {affiliate_leaderboard.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/70" data-testid={`aff-row-${a.id}`}>
                      <td className="px-5 py-3 font-semibold text-[#20364D]">{a.name}</td>
                      <td className="px-5 py-3 font-bold text-[#D4A843]">{fmt(a.earnings)}</td>
                      <td className="px-5 py-3">{a.deals}</td>
                      <td className="px-5 py-3">{a.conversions}</td>
                      <td className="px-5 py-3 font-bold">{pct(a.achievement_pct)}</td>
                      <td className="px-5 py-3"><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[a.status]}`}>{statusLabels[a.status]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-2" data-testid="affiliate-mobile-cards">
              {affiliate_leaderboard.map((a) => (
                <div key={a.id} className="bg-white rounded-2xl border p-4" data-testid={`aff-card-${a.id}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-[#20364D] text-sm">{a.name}</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[a.status]}`}>{statusLabels[a.status]}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-400">Earnings</span><div className="font-bold text-[#D4A843]">{fmt(a.earnings)}</div></div>
                    <div><span className="text-slate-400">Deals</span><div className="font-bold">{a.deals}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Action Panel */}
      {actions.length > 0 && (
        <div className="bg-white rounded-2xl border p-5" data-testid="action-panel">
          <h2 className="text-base font-bold text-[#20364D] flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Action Required
          </h2>
          <div className="space-y-2">
            {actions.map((a, i) => (
              <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl ${a.type === "warning" ? "bg-red-50" : "bg-blue-50"}`} data-testid={`action-${i}`}>
                {a.type === "warning" ? <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" /> :
                  <Lightbulb className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />}
                <div>
                  <p className={`text-sm font-medium ${a.type === "warning" ? "text-red-800" : "text-blue-800"}`}>{a.message}</p>
                  {a.names && <p className="text-xs text-slate-500 mt-0.5">{a.names.join(", ")}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
