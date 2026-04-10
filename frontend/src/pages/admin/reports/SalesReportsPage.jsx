import React, { useEffect, useState } from "react";
import api from "../../../lib/api";
import AppLoader from "../../../components/branding/AppLoader";
import { useBranding } from "../../../contexts/BrandingContext";
import { exportCSV, exportPDF, fmtMoney } from "../../../lib/reportExportUtils";
import {
  Users, Trophy, TrendingUp, FileText, Download,
  Calendar, BarChart3, Star, Target, ArrowRight, ShoppingCart
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const TABS = [
  { key: "performance", label: "Performance" },
  { key: "conversion", label: "Conversion" },
  { key: "leaderboard", label: "Leaderboard" },
];

export default function SalesReportsPage() {
  const branding = useBranding();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("performance");
  const [days, setDays] = useState(180);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/admin/reports/sales?days=${days}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [days]);

  const handlePDF = () => {
    if (!data) return;
    const k = data.kpis || {};
    const headers = tab === "performance"
      ? ["Rep", "Deals", "Revenue", "Avg Rating", "Commission"]
      : tab === "conversion"
      ? ["Month", "Quotes", "Orders", "Rate %"]
      : ["Rank", "Name", "Score", "Deals", "Label"];
    const rows = tab === "performance"
      ? (data.team_table || []).map((r) => [r.name, r.deals, fmtMoney(r.revenue), String(r.avg_rating), fmtMoney(r.commission)])
      : tab === "conversion"
      ? (data.charts?.conversion_trend || []).map((r) => [r.month, r.quotes, r.orders, `${r.rate}%`])
      : (data.leaderboard || []).map((r) => [r.rank, r.name, r.score, r.deals, r.label]);
    exportPDF({
      title: `Sales Report — ${TABS.find((t) => t.key === tab)?.label}`,
      subtitle: `Last ${days} days`,
      branding,
      kpis: [
        { label: "Total Deals", value: String(k.total_deals || 0) },
        { label: "Total Revenue", value: fmtMoney(k.total_revenue) },
        { label: "Avg Rating", value: String(k.avg_rating || "—") },
        { label: "Conversion Rate", value: `${k.conversion_rate || 0}%` },
      ],
      tableHeaders: headers,
      tableRows: rows,
      filename: `sales-${tab}-${days}d`,
    });
  };

  const handleCSV = () => {
    if (!data) return;
    if (tab === "performance") {
      exportCSV(`sales-performance-${days}d`, ["Rep", "Deals", "Revenue", "Pipeline", "Avg Rating", "Commission", "Total Orders"],
        (data.team_table || []).map((r) => [r.name, r.deals, r.revenue, r.pipeline, r.avg_rating, r.commission, r.total_orders])
      );
    } else if (tab === "conversion") {
      exportCSV(`sales-conversion-${days}d`, ["Month", "Quotes", "Orders", "Conversion Rate"],
        (data.charts?.conversion_trend || []).map((r) => [r.month, r.quotes, r.orders, r.rate])
      );
    } else {
      exportCSV(`sales-leaderboard-${days}d`, ["Rank", "Name", "Score", "Deals", "Label"],
        (data.leaderboard || []).map((r) => [r.rank, r.name, r.score, r.deals, r.label])
      );
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64" data-testid="sales-report-loading"><AppLoader text="Loading sales data..." size="md" /></div>;

  const k = data?.kpis || {};
  const teamTable = data?.team_table || [];
  const leaderboard = data?.leaderboard || [];
  const convTrend = data?.charts?.conversion_trend || [];
  const dealsTrend = data?.charts?.deals_trend || [];
  const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444", "#EC4899"];

  return (
    <div className="space-y-6" data-testid="sales-reports-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#20364D]" data-testid="sales-title">Sales Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Performance, conversion, and team leaderboard</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700" data-testid="sales-days-filter">
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>365 days</option>
            </select>
          </div>
          <button onClick={handlePDF} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50" data-testid="sales-export-pdf"><FileText className="w-3.5 h-3.5" /> PDF</button>
          <button onClick={handleCSV} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50" data-testid="sales-export-csv"><Download className="w-3.5 h-3.5" /> CSV</button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="sales-kpi-row">
        <KpiCard icon={ShoppingCart} label="Total Deals" value={k.total_deals || 0} color="bg-blue-50 text-blue-600" />
        <KpiCard icon={TrendingUp} label="Total Revenue" value={fmtMoney(k.total_revenue)} color="bg-green-50 text-green-600" />
        <KpiCard icon={Star} label="Avg Rating" value={k.avg_rating || "—"} color="bg-amber-50 text-amber-600" />
        <KpiCard icon={Target} label="Conversion" value={`${k.conversion_rate || 0}%`} color="bg-purple-50 text-purple-600" />
        <KpiCard icon={Users} label="Active Reps" value={k.active_reps || 0} color="bg-teal-50 text-teal-600" />
        <KpiCard icon={BarChart3} label="Pipeline" value={fmtMoney(k.pipeline_value)} color="bg-orange-50 text-orange-600" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit" data-testid="sales-tabs">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${tab === t.key ? "bg-white text-[#20364D] shadow-sm" : "text-slate-500 hover:text-slate-700"}`} data-testid={`sales-tab-${t.key}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "performance" && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white border rounded-2xl p-5" data-testid="sales-perf-table">
            <h3 className="font-semibold text-[#20364D] text-sm mb-4">Team Performance</h3>
            {teamTable.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-100">
                    <th className="text-left py-2.5 px-2 text-xs font-semibold text-slate-600 uppercase">Rep</th>
                    <th className="text-center py-2.5 px-2 text-xs font-semibold text-slate-600 uppercase">Deals</th>
                    <th className="text-right py-2.5 px-2 text-xs font-semibold text-slate-600 uppercase">Revenue</th>
                    <th className="text-right py-2.5 px-2 text-xs font-semibold text-slate-600 uppercase">Pipeline</th>
                    <th className="text-center py-2.5 px-2 text-xs font-semibold text-slate-600 uppercase">Rating</th>
                    <th className="text-right py-2.5 px-2 text-xs font-semibold text-slate-600 uppercase">Commission</th>
                  </tr></thead>
                  <tbody>
                    {teamTable.map((r) => (
                      <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">{(r.name || "?").charAt(0)}</div>
                            <span className="font-medium text-[#20364D] truncate max-w-[140px]">{r.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center font-semibold text-slate-700">{r.deals}</td>
                        <td className="py-2.5 px-2 text-right text-slate-600">{fmtMoney(r.revenue)}</td>
                        <td className="py-2.5 px-2 text-right text-slate-600">{fmtMoney(r.pipeline)}</td>
                        <td className="py-2.5 px-2 text-center"><span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${r.avg_rating >= 4 ? "text-green-600" : r.avg_rating >= 3 ? "text-amber-600" : r.avg_rating > 0 ? "text-red-600" : "text-slate-400"}`}><Star className="w-3 h-3" /> {r.avg_rating || "—"}</span></td>
                        <td className="py-2.5 px-2 text-right font-medium text-emerald-600">{fmtMoney(r.commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-center py-8 text-slate-400 text-sm">No data</p>}
          </div>
          <div className="bg-white border rounded-2xl p-5" data-testid="sales-deals-trend">
            <h3 className="font-semibold text-[#20364D] text-sm mb-4">Deals Trend</h3>
            {dealsTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dealsTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="deals" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center py-8 text-slate-400 text-sm">No data</p>}
          </div>
        </div>
      )}

      {tab === "conversion" && (
        <div className="bg-white border rounded-2xl p-5" data-testid="sales-conversion-chart">
          <h3 className="font-semibold text-[#20364D] text-sm mb-4">Quote → Order Conversion</h3>
          {convTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={convTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#94a3b8" }} unit="%" domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="quotes" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Quotes" />
                <Bar yAxisId="left" dataKey="orders" fill="#10B981" radius={[4, 4, 0, 0]} name="Orders" />
                <Line yAxisId="right" type="monotone" dataKey="rate" stroke="#D4A843" strokeWidth={2} name="Rate %" dot={{ r: 3 }} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center py-8 text-slate-400 text-sm">No data</p>}
        </div>
      )}

      {tab === "leaderboard" && (
        <div className="bg-white border rounded-2xl p-5" data-testid="sales-leaderboard">
          <h3 className="font-semibold text-[#20364D] text-sm mb-4">Sales Leaderboard</h3>
          {leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.map((entry) => (
                <div key={entry.rank} className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-slate-50 transition border-b border-slate-50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${entry.rank === 1 ? "bg-amber-100 text-amber-700" : entry.rank === 2 ? "bg-slate-200 text-slate-700" : entry.rank === 3 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"}`}>{entry.rank}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#20364D]">{entry.name}</p>
                    <p className="text-xs text-slate-400">{entry.deals} deals &middot; Score: {entry.score}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${entry.label === "Top Performer" ? "bg-green-100 text-green-700" : entry.label === "Strong" ? "bg-blue-100 text-blue-700" : entry.label === "Improving" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{entry.label}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-center py-8 text-slate-400 text-sm">No data</p>}
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-xl border bg-white p-4 flex flex-col gap-1">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-4 h-4" /></div>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
      <p className="text-lg font-bold text-[#20364D]">{value}</p>
    </div>
  );
}
