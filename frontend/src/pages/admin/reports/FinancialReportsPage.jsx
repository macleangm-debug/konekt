import React, { useEffect, useState } from "react";
import api from "../../../lib/api";
import AppLoader from "../../../components/branding/AppLoader";
import { useBranding } from "../../../contexts/BrandingContext";
import { exportCSV, exportPDF, fmtMoney, fmtMoneyRaw } from "../../../lib/reportExportUtils";
import {
  DollarSign, TrendingUp, CreditCard, FileText, Download,
  Calendar, ArrowUpRight, ArrowDownRight, CheckCircle, Clock
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const TABS = [
  { key: "revenue", label: "Revenue" },
  { key: "cashflow", label: "Cash Flow" },
  { key: "margin", label: "Margin" },
  { key: "commission", label: "Commission" },
];

export default function FinancialReportsPage() {
  const branding = useBranding();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("revenue");
  const [days, setDays] = useState(180);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/admin/reports/financial?days=${days}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [days]);

  const handlePDF = () => {
    if (!data) return;
    const k = data.kpis || {};
    const headers = tab === "revenue"
      ? ["Month", "Revenue", "Orders"]
      : tab === "cashflow"
      ? ["Month", "Revenue In", "Commission Out", "Net"]
      : tab === "margin"
      ? ["Month", "Revenue", "Cost", "Margin %"]
      : ["Rep", "Total", "Paid", "Pending"];
    const rows = tab === "commission"
      ? (data.commission_by_rep || []).map((r) => [r.name, fmtMoneyRaw(r.total), fmtMoneyRaw(r.paid), fmtMoneyRaw(r.pending)])
      : (data.charts?.[tab === "revenue" ? "revenue_trend" : tab === "cashflow" ? "cash_flow_trend" : "margin_trend"] || []).map((r) =>
          tab === "revenue" ? [r.month, fmtMoneyRaw(r.revenue), String(r.orders || 0)]
          : tab === "cashflow" ? [r.month, fmtMoneyRaw(r.revenue), fmtMoneyRaw(r.commissions), fmtMoneyRaw(r.net)]
          : [r.month, fmtMoneyRaw(r.revenue), fmtMoneyRaw(r.cost || 0), `${r.margin_pct}%`]
        );
    exportPDF({
      title: `Financial Report — ${TABS.find((t) => t.key === tab)?.label}`,
      subtitle: `Last ${days} days`,
      branding,
      kpis: [
        { label: "Total Revenue", value: fmtMoney(k.total_revenue) },
        { label: "Net Margin", value: `${k.margin_pct || 0}%` },
        { label: "Commission Total", value: fmtMoney(k.commission_total) },
        { label: "Outstanding", value: fmtMoney(k.outstanding_invoices) },
      ],
      tableHeaders: headers,
      tableRows: rows,
      filename: `financial-${tab}-${days}d`,
    });
  };

  const handleCSV = () => {
    if (!data) return;
    if (tab === "commission") {
      exportCSV(`commission-report-${days}d`,
        ["Rep", "Total", "Paid", "Pending", "Count"],
        (data.commission_by_rep || []).map((r) => [r.name, r.total, r.paid, r.pending, r.count])
      );
    } else {
      const trend = data.charts?.[tab === "revenue" ? "revenue_trend" : tab === "cashflow" ? "cash_flow_trend" : "margin_trend"] || [];
      const headers = tab === "revenue" ? ["Month", "Revenue", "Orders"] : tab === "cashflow" ? ["Month", "Revenue", "Commissions", "Net"] : ["Month", "Revenue", "Cost", "Margin%"];
      exportCSV(`financial-${tab}-${days}d`, headers,
        trend.map((r) => tab === "revenue" ? [r.month, r.revenue, r.orders || 0] : tab === "cashflow" ? [r.month, r.revenue, r.commissions, r.net] : [r.month, r.revenue, r.cost || 0, r.margin_pct])
      );
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64" data-testid="fin-report-loading"><AppLoader text="Loading financial data..." size="md" /></div>;

  const k = data?.kpis || {};
  const revTrend = data?.charts?.revenue_trend || [];
  const cfTrend = data?.charts?.cash_flow_trend || [];
  const mgTrend = data?.charts?.margin_trend || [];
  const commRep = data?.commission_by_rep || [];
  const commTrend = data?.charts?.commission_trend || [];
  const topCustomers = data?.top_customers || [];
  const paymentBreakdown = data?.payment_breakdown || [];
  const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

  return (
    <div className="space-y-6" data-testid="financial-reports-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#20364D]" data-testid="fin-title">Financial Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Revenue, cash flow, margins, and commissions</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700" data-testid="fin-days-filter">
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>365 days</option>
            </select>
          </div>
          <button onClick={handlePDF} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50" data-testid="fin-export-pdf"><FileText className="w-3.5 h-3.5" /> PDF</button>
          <button onClick={handleCSV} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50" data-testid="fin-export-csv"><Download className="w-3.5 h-3.5" /> CSV</button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="fin-kpi-row">
        <KpiCard icon={DollarSign} label="Total Revenue" value={fmtMoney(k.total_revenue)} color="bg-green-50 text-green-600" />
        <KpiCard icon={TrendingUp} label="Revenue (Month)" value={fmtMoney(k.revenue_month)} color="bg-emerald-50 text-emerald-600" />
        <KpiCard icon={CheckCircle} label="Collected" value={fmtMoney(k.collected)} color="bg-blue-50 text-blue-600" />
        <KpiCard icon={Clock} label="Outstanding" value={fmtMoney(k.outstanding_invoices)} color="bg-orange-50 text-orange-600" />
        <KpiCard icon={CreditCard} label="Commission" value={fmtMoney(k.commission_total)} color="bg-purple-50 text-purple-600" />
        <KpiCard icon={TrendingUp} label="Net Margin" value={`${k.margin_pct || 0}%`} color="bg-amber-50 text-amber-600" />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit" data-testid="fin-tabs">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${tab === t.key ? "bg-white text-[#20364D] shadow-sm" : "text-slate-500 hover:text-slate-700"}`} data-testid={`fin-tab-${t.key}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "revenue" && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white border rounded-2xl p-5" data-testid="fin-revenue-chart">
            <h3 className="font-semibold text-[#20364D] text-sm mb-4">Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={revTrend}>
                <defs>
                  <linearGradient id="finRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v) => [fmtMoney(v), "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="url(#finRevGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white border rounded-2xl p-5" data-testid="fin-top-customers">
            <h3 className="font-semibold text-[#20364D] text-sm mb-4">Top Customers</h3>
            <div className="space-y-3">
              {topCustomers.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{i + 1}</div>
                    <span className="text-sm text-slate-700 truncate max-w-[120px]">{c.customer}</span>
                  </div>
                  <span className="text-sm font-bold text-[#20364D]">{fmtMoney(c.revenue)}</span>
                </div>
              ))}
              {topCustomers.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No data</p>}
            </div>
          </div>
        </div>
      )}

      {tab === "cashflow" && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white border rounded-2xl p-5" data-testid="fin-cashflow-chart">
            <h3 className="font-semibold text-[#20364D] text-sm mb-4">Cash Flow (Revenue In vs Commissions Out)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={cfTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v, name) => [fmtMoney(v), name === "revenue" ? "Revenue In" : name === "commissions" ? "Commissions Out" : "Net"]} />
                <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="commissions" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white border rounded-2xl p-5" data-testid="fin-payment-breakdown">
            <h3 className="font-semibold text-[#20364D] text-sm mb-4">Payment Status</h3>
            {paymentBreakdown.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={paymentBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={55} innerRadius={25}>
                      {paymentBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 w-full mt-2">
                  {paymentBreakdown.map((p, i) => (
                    <div key={p.status} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-600 truncate flex-1">{p.status}</span>
                      <span className="font-bold text-slate-700">{p.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="text-sm text-slate-400 text-center py-8">No data</p>}
          </div>
        </div>
      )}

      {tab === "margin" && (
        <div className="bg-white border rounded-2xl p-5" data-testid="fin-margin-chart">
          <h3 className="font-semibold text-[#20364D] text-sm mb-4">Margin Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={mgTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} unit="%" domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v) => [`${v}%`, "Margin"]} />
              <Line type="monotone" dataKey="margin_pct" stroke="#D4A843" strokeWidth={2.5} dot={{ r: 4, fill: "#D4A843" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {tab === "commission" && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white border rounded-2xl p-5" data-testid="fin-commission-table">
            <h3 className="font-semibold text-[#20364D] text-sm mb-4">Commission by Rep</h3>
            {commRep.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-100">
                    <th className="text-left py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase">Rep</th>
                    <th className="text-right py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase">Total</th>
                    <th className="text-right py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase">Paid</th>
                    <th className="text-right py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase">Pending</th>
                    <th className="text-center py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase">Count</th>
                  </tr></thead>
                  <tbody>
                    {commRep.map((r) => (
                      <tr key={r.name} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2.5 px-2 font-medium text-[#20364D]">{r.name}</td>
                        <td className="py-2.5 px-2 text-right text-slate-600">{fmtMoney(r.total)}</td>
                        <td className="py-2.5 px-2 text-right text-green-600">{fmtMoney(r.paid)}</td>
                        <td className="py-2.5 px-2 text-right text-amber-600">{fmtMoney(r.pending)}</td>
                        <td className="py-2.5 px-2 text-center text-slate-500">{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-slate-400 text-center py-8">No commission data</p>}
          </div>
          <div className="bg-white border rounded-2xl p-5" data-testid="fin-commission-trend">
            <h3 className="font-semibold text-[#20364D] text-sm mb-4">Commission Trend</h3>
            {commTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={commTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v) => [fmtMoney(v), "Commission"]} />
                  <Bar dataKey="amount" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-slate-400 text-center py-8">No data</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-xl border bg-white p-4 flex flex-col gap-1">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
      <p className="text-lg font-bold text-[#20364D]">{value}</p>
    </div>
  );
}
