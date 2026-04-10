import React, { useEffect, useState } from "react";
import api from "../../../lib/api";
import AppLoader from "../../../components/branding/AppLoader";
import { useBranding } from "../../../contexts/BrandingContext";
import { exportCSV, exportPDF, fmtMoney } from "../../../lib/reportExportUtils";
import {
  DollarSign, ShoppingCart, TrendingUp, Star, BadgePercent, CheckCircle,
  AlertTriangle, Clock, FileText, Download, ChevronLeft, ChevronRight,
  Users, Package, Truck, CreditCard, Target, ArrowUpRight, ArrowDownRight,
  Lightbulb
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function WeeklyPerformanceReportPage() {
  const branding = useBranding();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weeksBack, setWeeksBack] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/admin/reports/weekly-performance?weeks_back=${weeksBack}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [weeksBack]);

  const handlePDF = () => {
    if (!data) return;
    const es = data.executive_summary || {};
    const sp = data.sales_performance || {};
    exportPDF({
      title: "Weekly Business Performance Report",
      subtitle: `${data.period?.start} — ${data.period?.end}`,
      branding,
      kpis: [
        { label: "Revenue", value: fmtMoney(es.revenue) },
        { label: "Orders", value: String(es.orders_completed || 0) },
        { label: "Margin", value: `${es.margin_pct || 0}%` },
        { label: "Rating", value: `${es.avg_rating || 0}/5` },
        { label: "Net Profit", value: fmtMoney(es.net_profit) },
      ],
      tableHeaders: ["Rep", "Deals", "Revenue", "Rating", "Commission"],
      tableRows: (sp.top_performers || []).map((r) => [r.name, r.deals, fmtMoney(r.revenue), String(r.avg_rating), fmtMoney(r.commission)]),
      filename: `weekly-performance-${data.period?.start?.replace(/ /g, "-")}`,
    });
  };

  const handleCSV = () => {
    if (!data) return;
    const all = [...(data.sales_performance?.top_performers || []), ...(data.sales_performance?.under_performers || [])];
    exportCSV(`weekly-performance-${data.period?.start?.replace(/ /g, "-")}`,
      ["Rep", "Deals", "Revenue", "Avg Rating", "Commission"],
      all.map((r) => [r.name, r.deals, r.revenue, r.avg_rating, r.commission])
    );
  };

  if (loading) return <div className="flex items-center justify-center h-64" data-testid="weekly-loading"><AppLoader text="Loading weekly report..." size="md" /></div>;
  if (!data) return <div className="text-center py-12 text-slate-400">Failed to load report</div>;

  const es = data.executive_summary || {};
  const sp = data.sales_performance || {};
  const fin = data.financial_summary || {};
  const cx = data.customer_experience || {};
  const pi = data.product_intelligence || {};
  const proc = data.procurement || {};
  const alerts = data.risk_alerts || [];
  const actions = data.action_recommendations || [];
  const coachingSummary = data.coaching_summary || [];
  const period = data.period || {};

  return (
    <div className="space-y-6" data-testid="weekly-report-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#20364D] to-[#2a4a6b] text-white rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="weekly-title">Weekly Business Performance</h1>
            <p className="text-slate-300 mt-1 text-sm">{period.start} — {period.end}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeeksBack((w) => w + 1)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition" data-testid="weekly-prev">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium px-3 py-1.5 bg-white/15 rounded-lg">
              {weeksBack === 0 ? "This Week" : `${weeksBack} week${weeksBack > 1 ? "s" : ""} ago`}
            </span>
            <button onClick={() => setWeeksBack((w) => Math.max(0, w - 1))} disabled={weeksBack === 0} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition disabled:opacity-30" data-testid="weekly-next">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={handlePDF} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium hover:bg-white/20 transition" data-testid="weekly-export-pdf">
              <FileText className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={handleCSV} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium hover:bg-white/20 transition" data-testid="weekly-export-csv">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
        </div>
      </div>

      {/* 1. Executive Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="weekly-kpi-row">
        <KpiCard icon={DollarSign} label="Revenue" value={fmtMoney(es.revenue)} color="bg-green-50 text-green-600" />
        <KpiCard icon={ShoppingCart} label="Orders" value={es.orders_completed || 0} color="bg-blue-50 text-blue-600" />
        <KpiCard icon={TrendingUp} label="Margin" value={`${es.margin_pct || 0}%`} color="bg-amber-50 text-amber-600" />
        <KpiCard icon={Star} label="Avg Rating" value={es.avg_rating || "—"} color="bg-purple-50 text-purple-600" />
        <KpiCard icon={BadgePercent} label="Discounts" value={fmtMoney(es.discounts_given)} color="bg-orange-50 text-orange-600" />
        <KpiCard icon={TrendingUp} label="Net Profit" value={fmtMoney(es.net_profit)} color="bg-emerald-50 text-emerald-600" />
      </div>

      {/* 2. Sales Performance */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-2xl p-5" data-testid="weekly-top-performers">
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpRight className="w-4 h-4 text-green-500" />
            <h3 className="font-semibold text-[#20364D] text-sm">Top Performers</h3>
          </div>
          {sp.top_performers?.length > 0 ? (
            <div className="space-y-3">
              {sp.top_performers.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-green-50/50 border border-green-100">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{i + 1}</div>
                    <div>
                      <p className="text-sm font-medium text-[#20364D]">{r.name}</p>
                      <p className="text-[10px] text-slate-400">{r.deals} deals &middot; {r.avg_rating}★</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-green-600">{fmtMoney(r.revenue)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-400 text-center py-6">No data for this period</p>}
        </div>

        <div className="bg-white border rounded-2xl p-5" data-testid="weekly-underperformers">
          <div className="flex items-center gap-2 mb-4">
            <ArrowDownRight className="w-4 h-4 text-red-500" />
            <h3 className="font-semibold text-[#20364D] text-sm">Needs Attention</h3>
          </div>
          {sp.under_performers?.length > 0 ? (
            <div className="space-y-3">
              {sp.under_performers.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-red-50/50 border border-red-100">
                  <div>
                    <p className="text-sm font-medium text-[#20364D]">{r.name}</p>
                    <p className="text-[10px] text-slate-400">{r.deals} deals &middot; {r.avg_rating}★</p>
                  </div>
                  <span className="text-xs font-bold text-red-600">{r.deals} deals</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-300" />
              <p className="text-sm text-slate-400">All reps performing well</p>
            </div>
          )}
        </div>
      </div>

      {/* Team Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500">Total Deals</p>
          <p className="text-2xl font-bold text-[#20364D]">{sp.total_deals || 0}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500">Pipeline Value</p>
          <p className="text-2xl font-bold text-[#20364D]">{fmtMoney(sp.pipeline_value)}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500">Conversion Rate</p>
          <p className="text-2xl font-bold text-[#20364D]">{sp.conversion_rate || 0}%</p>
        </div>
      </div>

      {/* 3. Risk & Alerts */}
      <div className="bg-white border rounded-2xl p-5" data-testid="weekly-risk-alerts">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <h3 className="font-semibold text-[#20364D] text-sm">Risk & Alerts</h3>
          {alerts.length > 0 && <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-700">{alerts.length}</span>}
        </div>
        {alerts.length > 0 ? (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border-l-2 ${a.severity === "critical" ? "border-l-red-400 bg-red-50/50" : "border-l-amber-400 bg-amber-50/30"}`}>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#20364D]">{a.message}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{a.alert_type} &middot; {a.created_at?.slice(0, 10)}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.severity === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{a.severity}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-300" />
            <p className="text-sm text-slate-400">No active alerts this week</p>
          </div>
        )}
      </div>

      {/* 4. Financial Summary + 5. Customer Experience */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-2xl p-5" data-testid="weekly-financial">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-[#20364D] text-sm">Financial Summary</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-sm text-slate-600">Collected</span>
              <span className="text-sm font-bold text-green-600">{fmtMoney(fin.collected)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-sm text-slate-600">Pending Payments</span>
              <span className="text-sm font-bold text-amber-600">{fin.pending_payments || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-sm text-slate-600">Outstanding Invoices</span>
              <span className="text-sm font-bold text-orange-600">{fmtMoney(fin.outstanding)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-600">Commission Payable</span>
              <span className="text-sm font-bold text-purple-600">{fmtMoney(fin.commission_payable)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-5" data-testid="weekly-cx">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-[#20364D] text-sm">Customer Experience</h3>
          </div>
          <div className="text-center mb-4">
            <p className="text-3xl font-bold text-[#20364D]">{cx.avg_rating || "—"}<span className="text-lg text-slate-400">/5</span></p>
            <p className="text-xs text-slate-400">Overall Rating</p>
          </div>
          {cx.rating_distribution?.length > 0 && (
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={cx.rating_distribution} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="stars" tick={{ fontSize: 11, fill: "#94a3b8" }} width={20} tickFormatter={(v) => `${v}★`} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="count" fill="#F59E0B" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {cx.negative_feedback?.length > 0 && (
            <div className="mt-3 space-y-1">
              {cx.negative_feedback.slice(0, 2).map((f, i) => (
                <div key={i} className="bg-red-50 rounded-lg p-2 border-l-2 border-red-400">
                  <p className="text-xs text-red-700 font-medium">{f.customer} — {f.stars}★</p>
                  <p className="text-[10px] text-red-600 italic">"{f.comment}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 6. Product Intelligence + 7. Procurement */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-2xl p-5" data-testid="weekly-products">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-purple-600" />
            <h3 className="font-semibold text-[#20364D] text-sm">Product Intelligence</h3>
          </div>
          <div className="mb-3">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Top Products</p>
            {pi.top_products?.map((p, i) => (
              <div key={i} className="flex justify-between py-1.5 text-sm">
                <span className="text-slate-700">{p.name}</span>
                <span className="font-bold text-[#20364D]">{p.units} units</span>
              </div>
            ))}
          </div>
          {pi.dead_products?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Dead Stock</p>
              {pi.dead_products.slice(0, 3).map((p, i) => (
                <div key={i} className="flex justify-between py-1.5 text-sm">
                  <span className="text-slate-600">{p.name}</span>
                  <span className="text-xs text-red-500">Last: {p.last_sold}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border rounded-2xl p-5" data-testid="weekly-procurement">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="w-4 h-4 text-teal-600" />
            <h3 className="font-semibold text-[#20364D] text-sm">Procurement Insights</h3>
          </div>
          {proc.restock?.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">Restock</p>
              {proc.restock.map((p, i) => (
                <div key={i} className="flex justify-between py-1.5 text-sm">
                  <span className="text-slate-700">{p.name}</span>
                  <span className="text-xs text-green-600 font-semibold">{p.units} units sold</span>
                </div>
              ))}
            </div>
          )}
          {proc.remove?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Review / Remove</p>
              {proc.remove.slice(0, 3).map((p, i) => (
                <div key={i} className="flex justify-between py-1.5 text-sm">
                  <span className="text-slate-600">{p.name}</span>
                  <span className="text-xs text-red-500">Last: {p.last_sold}</span>
                </div>
              ))}
            </div>
          )}
          {!proc.restock?.length && !proc.remove?.length && (
            <p className="text-sm text-slate-400 text-center py-6">No procurement actions this period</p>
          )}
        </div>
      </div>

      {/* 8. Team Coaching Summary */}
      {coachingSummary.length > 0 && (
        <div className="bg-white border rounded-2xl p-6" data-testid="weekly-coaching-summary">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-[#20364D] text-lg">Team Coaching Summary</h3>
          </div>
          <div className="space-y-3">
            {coachingSummary.map((rep, i) => {
              const isC = rep.status === "Critical";
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border-l-[3px] ${isC ? "border-l-red-500 bg-red-50/50" : "border-l-orange-400 bg-orange-50/50"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isC ? "bg-red-500 text-white" : "bg-orange-400 text-white"}`}>
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-[#20364D]">{rep.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isC ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                        {rep.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{rep.issue}</p>
                    <p className="text-xs text-teal-700 font-medium mt-1">&#8594; {rep.action}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 9. Action Recommendations */}
      <div className="bg-gradient-to-r from-[#20364D] to-[#2a4a6b] text-white rounded-2xl p-6" data-testid="weekly-actions">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-amber-300" />
          <h3 className="font-semibold text-lg">Actions for This Week</h3>
        </div>
        <div className="space-y-3">
          {actions.map((a, i) => (
            <div key={i} className="flex items-start gap-3 bg-white/10 rounded-lg p-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                a.severity === "critical" ? "bg-red-500 text-white" :
                a.severity === "warning" ? "bg-amber-400 text-white" :
                "bg-blue-400 text-white"
              }`}>{i + 1}</div>
              <div>
                <p className="text-sm">{a.message}</p>
                <p className="text-[10px] text-slate-300 mt-0.5">Source: {a.source}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
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
