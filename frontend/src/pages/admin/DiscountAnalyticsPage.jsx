import React, { useEffect, useState, useCallback } from "react";
import {
  TrendingDown, Percent, ShoppingCart, DollarSign, AlertTriangle,
  CheckCircle, XCircle, Filter, Download, Calendar,
} from "lucide-react";
import api from "../../lib/api";

const money = (v) => `TZS ${Number(v || 0).toLocaleString()}`;

const RISK_BADGE = {
  safe: { bg: "bg-emerald-100 text-emerald-700", label: "Safe" },
  warning: { bg: "bg-amber-100 text-amber-700", label: "Warning" },
  critical: { bg: "bg-red-100 text-red-700", label: "Critical" },
};

export default function DiscountAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [kpis, setKpis] = useState(null);
  const [trend, setTrend] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [salesBehavior, setSalesBehavior] = useState([]);
  const [highRisk, setHighRisk] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kRes, tRes, pRes, sRes, rRes, hRes] = await Promise.all([
        api.get(`/api/admin/discount-analytics/kpis?days=${days}`),
        api.get(`/api/admin/discount-analytics/trend?days=${days}`),
        api.get(`/api/admin/discount-analytics/top-products?days=${days}`),
        api.get(`/api/admin/discount-analytics/sales-behavior?days=${days}`),
        api.get(`/api/admin/discount-analytics/requests?days=${days}`),
        api.get(`/api/admin/discount-analytics/high-risk?days=${days}`),
      ]);
      setKpis(kRes.data);
      setTrend(tRes.data || []);
      setTopProducts(pRes.data || []);
      setSalesBehavior(sRes.data || []);
      setRequests(hRes.data || []);
      setHighRisk(rRes.data || []);
    } catch (e) {
      console.error("Failed to load analytics:", e);
    }
    setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const exportCSV = () => {
    if (!requests.length) return;
    const headers = ["Date", "Sales", "Customer", "Order", "Requested", "Approved", "Status", "Risk"];
    const rows = requests.map((r) => [
      (r.created_at || "").slice(0, 10),
      r.sales_name || "—", r.customer_name || "—", r.order_number || "—",
      r.requested_discount || "", r.approved_discount || "", r.status || "", r.risk_level || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `discount-analytics-${days}d.csv`; a.click();
  };

  return (
    <div className="space-y-6" data-testid="discount-analytics-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#20364D]">Discount Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Track discount behavior, revenue impact, margin impact, and approval patterns.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={days} onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
              data-testid="days-filter"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 6 months</option>
              <option value={365}>Last year</option>
            </select>
          </div>
          <button onClick={exportCSV} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50" data-testid="export-csv">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-12 text-slate-400">Loading analytics...</div>}

      {!loading && kpis && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="kpi-cards">
            <KpiCard icon={<TrendingDown className="w-4 h-4 text-red-500" />} label="Total Discounts" value={money(kpis.total_discounts_given)} />
            <KpiCard icon={<Percent className="w-4 h-4 text-amber-500" />} label="Avg Discount %" value={`${kpis.average_discount_percent}%`} />
            <KpiCard icon={<ShoppingCart className="w-4 h-4 text-blue-500" />} label="Discounted Orders" value={`${kpis.discounted_orders_count} (${kpis.discounted_orders_percent}%)`} />
            <KpiCard icon={<DollarSign className="w-4 h-4 text-emerald-500" />} label="Revenue After Disc." value={money(kpis.revenue_after_discounts)} />
            <KpiCard icon={<AlertTriangle className="w-4 h-4 text-red-500" />} label="Margin Impact" value={money(kpis.margin_impact)} />
            <KpiCard icon={<CheckCircle className="w-4 h-4 text-teal-500" />} label="Approval Rate" value={`${kpis.approval_rate}%`} sub={`${kpis.approved_requests} of ${kpis.total_requests}`} />
          </div>

          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Discount Trend */}
            <ChartCard title="Discount Trend" subtitle="Daily discount value">
              {trend.length === 0 ? (
                <EmptyChart />
              ) : (
                <div className="h-44 flex items-end gap-px px-2">
                  {trend.map((d, i) => {
                    const maxD = Math.max(...trend.map((t) => t.discount || 1));
                    const h = Math.max(4, (d.discount / maxD) * 100);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end group relative" title={`${d.date}: ${money(d.discount)}`}>
                        <div className="w-full rounded-t bg-red-400 hover:bg-red-500 transition-colors" style={{ height: `${h}%` }} />
                        <div className="hidden group-hover:block absolute -top-8 bg-slate-800 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap z-10">
                          {d.date}: {money(d.discount)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ChartCard>

            {/* Discount vs Revenue */}
            <ChartCard title="Discount vs Revenue" subtitle="Bars = discount, line = revenue">
              {trend.length === 0 ? (
                <EmptyChart />
              ) : (
                <div className="h-44 flex items-end gap-px px-2 relative">
                  {trend.map((d, i) => {
                    const maxR = Math.max(...trend.map((t) => t.revenue || 1));
                    const maxD = Math.max(...trend.map((t) => t.discount || 1));
                    const barH = Math.max(4, (d.discount / maxD) * 100);
                    const lineY = 100 - ((d.revenue / maxR) * 100);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end group relative" title={`${d.date}: Disc ${money(d.discount)}, Rev ${money(d.revenue)}`}>
                        <div className="w-full rounded-t bg-blue-300 hover:bg-blue-400 transition-colors" style={{ height: `${barH}%` }} />
                        <div className="absolute w-2 h-2 rounded-full bg-emerald-500 border border-white" style={{ bottom: `${100 - lineY}%` }} />
                      </div>
                    );
                  })}
                </div>
              )}
            </ChartCard>
          </div>

          {/* Secondary Charts */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Top Discounted Products */}
            <ChartCard title="Top Discounted Products">
              {topProducts.length === 0 ? (
                <EmptyChart msg="No discounted products in this period" />
              ) : (
                <div className="space-y-2 px-2">
                  {topProducts.slice(0, 8).map((p, i) => {
                    const maxVal = topProducts[0]?.total_discount || 1;
                    const w = Math.max(8, (p.total_discount / maxVal) * 100);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-32 truncate text-xs text-slate-600" title={p.name}>{p.name}</div>
                        <div className="flex-1">
                          <div className="h-5 rounded bg-amber-100">
                            <div className="h-5 rounded bg-amber-400 text-[10px] font-medium text-amber-900 flex items-center px-2" style={{ width: `${w}%` }}>
                              {money(p.total_discount)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ChartCard>

            {/* Sales Discount Behavior */}
            <ChartCard title="Sales Discount Behavior">
              {salesBehavior.length === 0 ? (
                <EmptyChart msg="No discount requests from sales" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-slate-400">
                        <th className="text-left py-2 px-2">Sales Person</th>
                        <th className="text-right py-2 px-2">Requests</th>
                        <th className="text-right py-2 px-2">Approved</th>
                        <th className="text-right py-2 px-2">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesBehavior.slice(0, 8).map((s, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-2 px-2 font-medium text-slate-700">{s.sales_name}</td>
                          <td className="text-right py-2 px-2">{s.total_requests}</td>
                          <td className="text-right py-2 px-2">{s.approved}</td>
                          <td className="text-right py-2 px-2">{s.approval_rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartCard>
          </div>

          {/* High Risk Discounts */}
          <TableCard title="High Risk Discounts" subtitle="Orders where discounts significantly reduced margin">
            {highRisk.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">No high-risk discounts detected in this period.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" data-testid="high-risk-table">
                  <thead>
                    <tr className="border-b text-slate-400">
                      <th className="text-left py-2.5 px-3">Order</th>
                      <th className="text-left py-2.5 px-3">Customer</th>
                      <th className="text-left py-2.5 px-3">Sales</th>
                      <th className="text-right py-2.5 px-3">Discount</th>
                      <th className="text-right py-2.5 px-3">Disc %</th>
                      <th className="text-right py-2.5 px-3">Margin Left</th>
                      <th className="text-center py-2.5 px-3">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {highRisk.map((r, i) => {
                      const badge = RISK_BADGE[r.risk_level] || RISK_BADGE.safe;
                      return (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono">{r.order_number}</td>
                          <td className="py-2 px-3">{r.customer_name}</td>
                          <td className="py-2 px-3">{r.sales_name}</td>
                          <td className="text-right py-2 px-3 font-medium">{money(r.discount_applied)}</td>
                          <td className="text-right py-2 px-3">{r.discount_percent}%</td>
                          <td className="text-right py-2 px-3">{r.margin_remaining_pct}%</td>
                          <td className="text-center py-2 px-3">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg}`} data-testid={`risk-badge-${r.risk_level}`}>
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TableCard>

          {/* Discount Requests Table */}
          <TableCard title="Discount Requests" subtitle="Operational visibility into requests and decisions">
            {requests.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">No discount requests in this period.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" data-testid="discount-requests-table">
                  <thead>
                    <tr className="border-b text-slate-400">
                      <th className="text-left py-2.5 px-3">Date</th>
                      <th className="text-left py-2.5 px-3">Sales</th>
                      <th className="text-left py-2.5 px-3">Customer</th>
                      <th className="text-left py-2.5 px-3">Order/Quote</th>
                      <th className="text-right py-2.5 px-3">Requested</th>
                      <th className="text-right py-2.5 px-3">Approved</th>
                      <th className="text-center py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-500">{(r.created_at || "").slice(0, 10)}</td>
                        <td className="py-2 px-3">{r.sales_name || "—"}</td>
                        <td className="py-2 px-3">{r.customer_name || "—"}</td>
                        <td className="py-2 px-3 font-mono">{r.order_number || r.quote_number || "—"}</td>
                        <td className="text-right py-2 px-3">{r.requested_discount ? money(r.requested_discount) : "—"}</td>
                        <td className="text-right py-2 px-3">{r.approved_discount ? money(r.approved_discount) : "—"}</td>
                        <td className="text-center py-2 px-3">
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TableCard>
        </>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1" data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center gap-2 text-slate-400 text-xs">
        {icon} {label}
      </div>
      <div className="text-lg font-bold text-[#20364D]">{value}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <div className="text-sm font-bold text-[#20364D]">{title}</div>
        {subtitle && <div className="text-[10px] text-slate-400">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function TableCard({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="text-sm font-bold text-[#20364D]">{title}</div>
        {subtitle && <div className="text-[10px] text-slate-400 mt-0.5">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ msg }) {
  return <div className="h-44 flex items-center justify-center text-xs text-slate-300">{msg || "No data for this period"}</div>;
}

function StatusBadge({ status }) {
  const map = {
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
    pending: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${map[status] || "bg-slate-100 text-slate-600"}`}>
      {status || "—"}
    </span>
  );
}
