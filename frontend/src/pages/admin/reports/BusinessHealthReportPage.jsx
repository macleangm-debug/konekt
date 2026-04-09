import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../lib/api";
import AppLoader from "../../../components/branding/AppLoader";
import { useBranding } from "../../../contexts/BrandingContext";
import { exportCSV, exportPDF, fmtMoney } from "../../../lib/reportExportUtils";
import {
  TrendingUp, DollarSign, Star, ShieldAlert, AlertTriangle,
  Download, FileText, Calendar, Activity, BarChart3, ArrowRight
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart
} from "recharts";

export default function BusinessHealthReportPage() {
  const branding = useBranding();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(180);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/admin/reports/business-health?days=${days}`);
        setData(res.data);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [days]);

  const handleExportPDF = () => {
    if (!data) return;
    const k = data.kpis || {};
    exportPDF({
      title: "Business Health Report",
      subtitle: `Last ${days} days — Executive Overview`,
      branding,
      kpis: [
        { label: "Total Revenue", value: fmtMoney(k.total_revenue) },
        { label: "Net Margin", value: `${k.margin_pct || 0}%` },
        { label: "Avg Rating", value: String(k.avg_rating || "—") },
        { label: "Active Customers", value: String(k.active_customers || 0) },
        { label: "Total Orders", value: String(k.total_orders || 0) },
      ],
      tableHeaders: ["Metric", "Value"],
      tableRows: [
        ["Total Revenue", fmtMoney(k.total_revenue)],
        ["Revenue (This Month)", fmtMoney(k.revenue_month)],
        ["Net Margin", `${k.margin_pct || 0}%`],
        ["Average Rating", `${k.avg_rating || 0} / 5`],
        ["Total Orders", String(k.total_orders || 0)],
        ["Active Customers", String(k.active_customers || 0)],
        ["Pending Payments", String(k.pending_payments || 0)],
        ["Outstanding Invoices", String(k.outstanding_invoices || 0)],
        ["Discount Risk Score", String(k.discount_risk_score || "Low")],
      ],
      filename: `business-health-${days}d`,
    });
  };

  const handleExportCSV = () => {
    if (!data?.alerts) return;
    exportCSV(
      `business-health-alerts-${days}d`,
      ["Type", "Severity", "Message", "Date"],
      (data.alerts || []).map((a) => [a.type, a.severity, a.message, a.date || ""])
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="bh-report-loading">
        <AppLoader text="Loading business health..." size="md" />
      </div>
    );
  }

  const k = data?.kpis || {};
  const revTrend = data?.charts?.revenue_trend || [];
  const marginTrend = data?.charts?.margin_trend || [];
  const ratingTrend = data?.charts?.rating_trend || [];
  const discountTrend = data?.charts?.discount_risk_trend || [];
  const alerts = data?.alerts || [];

  return (
    <div className="space-y-6" data-testid="business-health-report">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#20364D]" data-testid="bh-title">Business Health</h1>
          <p className="text-sm text-slate-500 mt-1">Executive overview — revenue, margins, quality, and risk</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={days} onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
              data-testid="bh-days-filter"
            >
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 180 days</option>
              <option value={365}>Last 365 days</option>
            </select>
          </div>
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50" data-testid="bh-export-pdf">
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50" data-testid="bh-export-csv">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="bh-kpi-row">
        <KpiCard icon={DollarSign} label="Total Revenue" value={fmtMoney(k.total_revenue)} color="bg-green-50 text-green-600" />
        <KpiCard icon={TrendingUp} label="Net Margin" value={`${k.margin_pct || 0}%`} color="bg-blue-50 text-blue-600" />
        <KpiCard icon={Star} label="Avg Rating" value={k.avg_rating || "—"} color="bg-amber-50 text-amber-600" />
        <KpiCard icon={Activity} label="Total Orders" value={k.total_orders || 0} color="bg-purple-50 text-purple-600" />
        <KpiCard icon={AlertTriangle} label="Pending Payments" value={k.pending_payments || 0} color="bg-orange-50 text-orange-600" />
        <KpiCard icon={ShieldAlert} label="Risk Score" value={k.discount_risk_score || "Low"} color="bg-red-50 text-red-600" />
      </div>

      {/* Charts Row 1: Revenue + Margin */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-2xl p-5" data-testid="bh-revenue-trend">
          <h3 className="font-semibold text-[#20364D] text-sm mb-4">Revenue Trend</h3>
          {revTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revTrend}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 12 }} formatter={(v) => [fmtMoney(v), "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">No data</div>}
        </div>

        <div className="bg-white border rounded-2xl p-5" data-testid="bh-margin-trend">
          <h3 className="font-semibold text-[#20364D] text-sm mb-4">Margin Trend</h3>
          {marginTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={marginTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} unit="%" domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 12 }} formatter={(v) => [`${v}%`, "Margin"]} />
                <Line type="monotone" dataKey="margin_pct" stroke="#D4A843" strokeWidth={2.5} dot={{ r: 4, fill: "#D4A843" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">No data</div>}
        </div>
      </div>

      {/* Charts Row 2: Rating + Discount Risk */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-2xl p-5" data-testid="bh-rating-trend">
          <h3 className="font-semibold text-[#20364D] text-sm mb-4">Rating Trend</h3>
          {ratingTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={ratingTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} domain={[0, 5]} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 12 }} formatter={(v) => [`${v}/5`, "Avg Rating"]} />
                <Line type="monotone" dataKey="avg_rating" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 4, fill: "#F59E0B" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">No data</div>}
        </div>

        <div className="bg-white border rounded-2xl p-5" data-testid="bh-discount-risk-trend">
          <h3 className="font-semibold text-[#20364D] text-sm mb-4">Discount Risk Trend</h3>
          {discountTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={discountTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 12 }} />
                <Bar dataKey="warning" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Warning" />
                <Bar dataKey="critical" fill="#EF4444" radius={[4, 4, 0, 0]} name="Critical" />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">No data</div>}
        </div>
      </div>

      {/* Alerts Summary */}
      <div className="bg-white border rounded-2xl p-5" data-testid="bh-alerts-summary">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h3 className="font-semibold text-[#20364D] text-sm">Active Alerts</h3>
            {alerts.length > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-700">{alerts.length}</span>
            )}
          </div>
        </div>
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">No active alerts — system healthy</div>
        ) : (
          <div className="space-y-2 max-h-[240px] overflow-y-auto">
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${
                a.severity === "critical" ? "bg-red-50 border-l-2 border-red-400" :
                a.severity === "warning" ? "bg-amber-50 border-l-2 border-amber-400" :
                "bg-blue-50 border-l-2 border-blue-400"
              }`}>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#20364D]">{a.message}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{a.type} &middot; {a.date || ""}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  a.severity === "critical" ? "bg-red-100 text-red-700" :
                  a.severity === "warning" ? "bg-amber-100 text-amber-700" :
                  "bg-blue-100 text-blue-700"
                }`}>{a.severity}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/admin/reports/financial" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="bh-link-financial">
          <DollarSign className="w-4 h-4 text-[#20364D]" /> Financial Reports <ArrowRight className="w-3 h-3 ml-auto text-slate-400" />
        </Link>
        <Link to="/admin/reports/sales" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="bh-link-sales">
          <BarChart3 className="w-4 h-4 text-[#20364D]" /> Sales Reports <ArrowRight className="w-3 h-3 ml-auto text-slate-400" />
        </Link>
        <Link to="/admin/sales-ratings" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="bh-link-cx">
          <Star className="w-4 h-4 text-[#20364D]" /> Customer Experience <ArrowRight className="w-3 h-3 ml-auto text-slate-400" />
        </Link>
        <Link to="/admin/discount-analytics" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="bh-link-risk">
          <ShieldAlert className="w-4 h-4 text-[#20364D]" /> Risk & Governance <ArrowRight className="w-3 h-3 ml-auto text-slate-400" />
        </Link>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }) {
  return (
    <div className={`rounded-xl border bg-white p-4 flex flex-col gap-1`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
      <p className="text-lg font-bold text-[#20364D]">{value}</p>
    </div>
  );
}
