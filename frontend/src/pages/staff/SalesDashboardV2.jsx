import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import {
  TrendingUp, Phone, ArrowRight, Target, Wallet,
  ShoppingCart, Users, Clock, Flame, AlertTriangle,
  FileText, ChevronRight, Loader2
} from "lucide-react";
import SalesContentBlock from "../../components/sales/SalesContentBlock";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function shortMoney(v) {
  const n = Number(v || 0);
  if (n >= 1_000_000) return `TZS ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `TZS ${(n / 1_000).toFixed(0)}K`;
  return money(v);
}

const URGENCY_CONFIG = {
  hot: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", badge: "bg-orange-500", icon: Flame },
  high: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "bg-red-500", icon: AlertTriangle },
  medium: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", badge: "bg-yellow-500", icon: Clock },
  low: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-600", badge: "bg-slate-400", icon: FileText },
};

const STATUS_COLORS = {
  expected: "text-blue-600 bg-blue-50",
  pending: "text-yellow-600 bg-yellow-50",
  pending_payout: "text-orange-600 bg-orange-50",
  approved: "text-green-600 bg-green-50",
  paid: "text-emerald-700 bg-emerald-50",
};

export default function SalesDashboardV2() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.get("/api/staff/sales-dashboard");
      setData(res.data);
    } catch (err) {
      console.error("Failed to load sales dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="sales-dashboard-loading">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4A843]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-slate-500" data-testid="sales-dashboard-error">
        <p>Unable to load dashboard. Please refresh.</p>
      </div>
    );
  }

  const { kpis, today_actions, pipeline, recent_orders, assigned_customers, staff_name } = data;

  return (
    <div className="space-y-6" data-testid="sales-dashboard-v2">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a]">
            Good {getGreeting()}, {staff_name || "Sales"}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link
          to="/staff/orders"
          className="flex items-center gap-2 bg-[#0f172a] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1e293b] transition"
          data-testid="view-all-orders-btn"
        >
          <ShoppingCart className="w-4 h-4" /> All Orders
        </Link>
      </div>

      {/* ═══ KPI ROW ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="kpi-row">
        <KpiCard
          label="Today's Revenue"
          value={shortMoney(kpis.today_revenue)}
          sub={`${kpis.today_orders} order${kpis.today_orders !== 1 ? "s" : ""}`}
          icon={<TrendingUp className="w-5 h-5" />}
          accent="text-emerald-600"
          testId="kpi-today-revenue"
        />
        <KpiCard
          label="This Month"
          value={shortMoney(kpis.month_revenue)}
          sub={`${kpis.month_orders} orders`}
          icon={<Target className="w-5 h-5" />}
          accent="text-blue-600"
          testId="kpi-month-revenue"
        />
        <KpiCard
          label="Open Pipeline"
          value={shortMoney(kpis.pipeline_value)}
          sub={`${kpis.open_orders} open deals`}
          icon={<ShoppingCart className="w-5 h-5" />}
          accent="text-orange-600"
          testId="kpi-pipeline"
        />
        <KpiCard
          label="Commission"
          value={shortMoney(kpis.total_earned)}
          sub={kpis.pending_payout > 0 ? `${shortMoney(kpis.pending_payout)} pending` : "No pending"}
          icon={<Wallet className="w-5 h-5" />}
          accent="text-[#D4A843]"
          testId="kpi-commission"
        />
      </div>

      {/* ═══ PIPELINE FUNNEL ═══ */}
      <div className="bg-white border rounded-xl p-5" data-testid="pipeline-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#0f172a]">Sales Pipeline</h2>
          <Link to="/staff/portfolio" className="text-xs text-slate-500 hover:text-[#0f172a] transition flex items-center gap-1">
            View CRM <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="flex items-center gap-1" data-testid="pipeline-funnel">
          {[
            { label: "New", count: pipeline.new_leads, color: "bg-slate-200 text-slate-700" },
            { label: "Contacted", count: pipeline.contacted, color: "bg-blue-100 text-blue-700" },
            { label: "Quoted", count: pipeline.quoted, color: "bg-yellow-100 text-yellow-700" },
            { label: "Approved", count: pipeline.approved, color: "bg-orange-100 text-orange-700" },
            { label: "Paid", count: pipeline.paid, color: "bg-green-100 text-green-700" },
            { label: "Fulfilled", count: pipeline.fulfilled, color: "bg-emerald-100 text-emerald-800" },
          ].map((stage, i, arr) => (
            <React.Fragment key={stage.label}>
              <div
                className={`flex-1 ${stage.color} rounded-lg py-2.5 px-2 text-center`}
                data-testid={`pipeline-stage-${stage.label.toLowerCase()}`}
              >
                <div className="text-lg font-bold">{stage.count}</div>
                <div className="text-[10px] font-medium uppercase tracking-wide">{stage.label}</div>
              </div>
              {i < arr.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ═══ TODAY'S ACTIONS + CRM ═══ */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Today's Actions — 3 cols */}
        <div className="lg:col-span-3 bg-white border rounded-xl p-5" data-testid="today-actions-section">
          <h2 className="text-base font-bold text-[#0f172a] mb-3">
            Today's Actions
            {today_actions.length > 0 && (
              <span className="ml-2 text-xs font-normal text-slate-400">({today_actions.length})</span>
            )}
          </h2>
          {today_actions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Target className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">All caught up! No pending actions.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {today_actions.map((action, i) => {
                const cfg = URGENCY_CONFIG[action.urgency] || URGENCY_CONFIG.low;
                const Icon = cfg.icon;
                return (
                  <Link
                    key={i}
                    to={action.href || "#"}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${cfg.bg} ${cfg.border} hover:shadow-sm transition group`}
                    data-testid={`action-item-${i}`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${cfg.badge} text-white flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${cfg.text} truncate`}>{action.title}</div>
                      <div className="text-xs text-slate-500 truncate">{action.description}</div>
                    </div>
                    {action.phone && (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(`tel:${action.phone}`); }}
                        className="p-2 rounded-lg bg-green-100 hover:bg-green-200 transition flex-shrink-0"
                        data-testid={`call-btn-${i}`}
                      >
                        <Phone className="w-3.5 h-3.5 text-green-600" />
                      </button>
                    )}
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition flex-shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Assigned CRM — 2 cols */}
        <div className="lg:col-span-2 bg-white border rounded-xl p-5" data-testid="crm-section">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-[#0f172a]">
              My Customers
              <span className="ml-1.5 text-xs font-normal text-slate-400">({assigned_customers.length})</span>
            </h2>
            <Link to="/staff/portfolio" className="text-xs text-slate-500 hover:text-[#0f172a] transition flex items-center gap-1">
              All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {assigned_customers.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No assigned customers yet.</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
              {assigned_customers.slice(0, 15).map((cust) => (
                <div
                  key={cust.id}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition group"
                  data-testid={`crm-customer-${cust.id}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#20364D]/10 flex items-center justify-center text-xs font-bold text-[#20364D] flex-shrink-0">
                      {(cust.name || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{cust.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{cust.company || cust.email}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    cust.status === "new" ? "bg-blue-100 text-blue-600" :
                    cust.status === "contacted" ? "bg-yellow-100 text-yellow-600" :
                    cust.status === "qualified" ? "bg-green-100 text-green-600" :
                    "bg-slate-100 text-slate-500"
                  }`}>
                    {cust.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ CONTENT TO SHARE TODAY ═══ */}
      <SalesContentBlock />

      {/* ═══ COMMISSION PER ORDER TABLE ═══ */}
      <div className="bg-white border rounded-xl p-5" data-testid="commission-table-section">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-[#0f172a]">Commission per Order</h2>
          <Link to="/staff/commission-dashboard" className="text-xs text-slate-500 hover:text-[#0f172a] transition flex items-center gap-1">
            Full Report <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {recent_orders.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Wallet className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No orders assigned yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="commission-table">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Order</th>
                  <th className="pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Customer</th>
                  <th className="pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wide text-right">Order Total</th>
                  <th className="pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wide text-right">Your Commission</th>
                  <th className="pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wide text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent_orders.slice(0, 10).map((order) => (
                  <tr key={order.order_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition" data-testid={`commission-row-${order.order_number}`}>
                    <td className="py-2.5">
                      <span className="font-mono text-xs text-slate-600">{order.order_number}</span>
                    </td>
                    <td className="py-2.5 text-slate-700">{order.customer_name}</td>
                    <td className="py-2.5 text-right font-medium text-slate-800">{money(order.total)}</td>
                    <td className="py-2.5 text-right font-bold text-[#D4A843]">{money(order.commission_amount)}</td>
                    <td className="py-2.5 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.commission_status] || STATUS_COLORS.expected}`}>
                        {order.commission_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon, accent, testId }) {
  return (
    <div className="bg-white border rounded-xl p-4" data-testid={testId}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`${accent || "text-slate-400"}`}>{icon}</div>
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-xl font-bold text-[#0f172a]">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
