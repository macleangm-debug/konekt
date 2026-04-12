import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Package, Check, Clock, DollarSign, Users, ShoppingCart, BarChart3, ArrowRight } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const fmt = (v) => {
  const n = Number(v || 0);
  if (n >= 1000000) return `TZS ${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `TZS ${(n / 1000).toFixed(0)}K`;
  return `TZS ${n.toLocaleString("en-US")}`;
};

function KpiCard({ label, value, change, icon: Icon, accent }) {
  const isUp = change > 0;
  return (
    <div className="bg-white rounded-xl border p-4" data-testid={`kpi-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center"><Icon className="w-4 h-4 text-[#20364D]" /></div>
        {change !== undefined && change !== null && (
          <span className={`text-[11px] font-bold flex items-center gap-0.5 ${isUp ? "text-green-600" : change < 0 ? "text-red-600" : "text-slate-400"}`}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : change < 0 ? <TrendingDown className="w-3 h-3" /> : null}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="mt-2">
        <div className="text-xl font-extrabold text-[#20364D]">{value}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function ChannelBar({ channels }) {
  const colors = { Structured: "#20364D", "Walk-in": "#D4A843", Affiliate: "#10b981" };
  const total = channels.reduce((s, c) => s + c.revenue, 0) || 1;
  return (
    <div className="bg-white rounded-2xl border p-5" data-testid="channel-performance">
      <h3 className="text-base font-bold text-[#20364D] mb-4">Channel Performance</h3>
      <div className="flex rounded-lg overflow-hidden h-3 mb-4">
        {channels.map((c) => (
          <div key={c.name} style={{ width: `${(c.revenue / total) * 100}%`, backgroundColor: colors[c.name] || "#94a3b8" }} title={`${c.name}: ${c.pct}%`} />
        ))}
      </div>
      <div className="space-y-2">
        {channels.map((c) => (
          <div key={c.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[c.name] || "#94a3b8" }} />
              <span className="text-sm font-medium text-[#20364D]">{c.name}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-500">{c.orders} orders</span>
              <span className="font-bold text-[#20364D]">{fmt(c.revenue)}</span>
              <span className="text-xs font-semibold text-slate-400">{c.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Funnel({ data }) {
  const steps = [
    { key: "quotes", label: "Quotes", count: data.quotes, color: "#6366f1" },
    { key: "invoices", label: "Invoices", count: data.invoices, color: "#3b82f6" },
    { key: "orders", label: "Orders", count: data.orders, color: "#D4A843" },
    { key: "completed", label: "Completed", count: data.completed, color: "#10b981" },
  ];
  const max = Math.max(...steps.map((s) => s.count), 1);
  return (
    <div className="bg-white rounded-2xl border p-5" data-testid="conversion-funnel">
      <h3 className="text-base font-bold text-[#20364D] mb-4">Conversion Funnel</h3>
      <div className="space-y-3">
        {steps.map((s, i) => {
          const prev = i > 0 ? steps[i - 1].count : null;
          const convRate = prev ? Math.round((s.count / Math.max(prev, 1)) * 100) : null;
          return (
            <div key={s.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-[#20364D]">{s.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{s.count}</span>
                  {convRate !== null && <span className="text-[11px] text-slate-400">{convRate}% conv.</span>}
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${(s.count / max) * 100}%`, backgroundColor: s.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OpsCard({ label, count, severity }) {
  const bg = severity === "critical" ? "bg-red-50 border-red-200" : severity === "warning" ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200";
  const text = severity === "critical" ? "text-red-700" : severity === "warning" ? "text-amber-700" : "text-green-700";
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className={`text-2xl font-extrabold ${text}`}>{count}</div>
      <div className="text-xs text-slate-600 mt-0.5">{label}</div>
    </div>
  );
}

function RevenueMiniChart({ data }) {
  if (!data || data.length === 0) return <div className="text-sm text-slate-400 py-8 text-center">No revenue data for this period</div>;
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const barW = Math.max(4, Math.min(24, 600 / data.length));
  return (
    <div className="flex items-end gap-[2px] h-36" data-testid="revenue-chart">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end" title={`${d.date}: ${fmt(d.revenue)}`}>
          <div className="w-full rounded-t-sm bg-[#20364D] hover:bg-[#D4A843] transition-colors" style={{ height: `${(d.revenue / max) * 100}%`, maxWidth: barW, minHeight: 2 }} />
        </div>
      ))}
    </div>
  );
}

export default function AdvancedAnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => { loadData(); }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/api/admin/analytics/dashboard?days=${period}`);
      setData(r.data);
    } catch { toast.error("Failed to load analytics"); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading analytics...</div>;
  if (!data) return <div className="p-8 text-center text-slate-500">Failed to load analytics</div>;

  const k = data.kpis || {};

  return (
    <div className="p-6 space-y-5" data-testid="analytics-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#20364D]">Business Analytics</h1>
          <p className="text-sm text-slate-500">Last {period} days performance overview</p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setPeriod(d)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${period === d ? "bg-white text-[#20364D] shadow-sm" : "text-slate-500"}`}
              data-testid={`period-${d}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <KpiCard label="Revenue" value={fmt(k.total_revenue)} change={k.revenue_change_pct} icon={DollarSign} />
        <KpiCard label="Orders" value={k.total_orders} icon={ShoppingCart} />
        <KpiCard label="Completion" value={`${k.completion_rate}%`} icon={Check} />
        <KpiCard label="Avg Order" value={fmt(k.avg_order_value)} icon={BarChart3} />
        <KpiCard label="Pending" value={k.pending_confirmations} icon={Clock} />
        <KpiCard label="Walk-in %" value={`${k.walkin_revenue_pct}%`} icon={Package} />
        <KpiCard label="Affiliate %" value={`${k.affiliate_revenue_pct}%`} icon={Users} />
        <KpiCard label="Structured %" value={`${100 - (k.walkin_revenue_pct || 0) - (k.affiliate_revenue_pct || 0)}%`} icon={TrendingUp} />
      </div>

      {/* Revenue + Insights */}
      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 bg-white rounded-2xl border p-5">
          <h3 className="text-base font-bold text-[#20364D] mb-4">Revenue Trend</h3>
          <RevenueMiniChart data={data.revenue_trend} />
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>{data.revenue_trend?.[0]?.date || ""}</span>
            <span>{data.revenue_trend?.[data.revenue_trend.length - 1]?.date || ""}</span>
          </div>
        </div>
        <div className="lg:col-span-2 bg-[#20364D] rounded-2xl p-5 text-white">
          <h3 className="text-base font-bold mb-3">Key Insights</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 mt-0.5 text-[#D4A843] shrink-0" />
              <span>Revenue {k.revenue_change_pct >= 0 ? "up" : "down"} {Math.abs(k.revenue_change_pct)}% vs previous period</span>
            </div>
            <div className="flex items-start gap-2">
              <Package className="w-4 h-4 mt-0.5 text-[#D4A843] shrink-0" />
              <span>Walk-in sales: {k.walkin_revenue_pct}% of revenue ({data.channels?.find(c => c.name === "Walk-in")?.orders || 0} orders)</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 text-[#D4A843] shrink-0" />
              <span>{k.completion_rate}% orders completed successfully</span>
            </div>
            {k.pending_confirmations > 0 && (
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
                <span>{k.pending_confirmations} orders awaiting confirmation</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Channel + Funnel */}
      <div className="grid lg:grid-cols-2 gap-5">
        <ChannelBar channels={data.channels || []} />
        <Funnel data={data.funnel || {}} />
      </div>

      {/* Operations Health */}
      <div>
        <h3 className="text-base font-bold text-[#20364D] mb-3">Operations Health</h3>
        <div className="grid grid-cols-3 gap-3">
          <OpsCard label="Stale Orders (>7d)" count={data.operations?.stale_orders || 0} severity={data.operations?.stale_orders > 10 ? "critical" : data.operations?.stale_orders > 0 ? "warning" : "ok"} />
          <OpsCard label="Overdue Invoices" count={data.operations?.overdue_invoices || 0} severity={data.operations?.overdue_invoices > 5 ? "critical" : data.operations?.overdue_invoices > 0 ? "warning" : "ok"} />
          <OpsCard label="Pending Confirmations" count={data.operations?.pending_confirmations || 0} severity={data.operations?.pending_confirmations > 5 ? "warning" : "ok"} />
        </div>
      </div>

      {/* Top Performers */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border p-5" data-testid="top-customers">
          <h3 className="text-base font-bold text-[#20364D] mb-3">Top Customers</h3>
          {(data.top_customers || []).length === 0 ? <p className="text-sm text-slate-400">No data</p> : (
            <div className="space-y-2">
              {data.top_customers.map((c, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{i + 1}</div>
                    <span className="text-sm font-medium text-[#20364D]">{c.name}</span>
                  </div>
                  <div className="text-sm font-bold text-[#20364D]">{fmt(c.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl border p-5" data-testid="top-sales">
          <h3 className="text-base font-bold text-[#20364D] mb-3">Top Sales Staff</h3>
          {(data.top_sales || []).length === 0 ? <p className="text-sm text-slate-400">No data</p> : (
            <div className="space-y-2">
              {data.top_sales.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{i + 1}</div>
                    <span className="text-sm font-medium text-[#20364D]">{s.name}</span>
                  </div>
                  <div className="text-sm font-bold text-[#20364D]">{fmt(s.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
