import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import AppLoader from "../../components/branding/AppLoader";
import {
  TrendingUp, Phone, ArrowRight, Target, Wallet,
  ShoppingCart, Users, Clock, Flame, AlertTriangle,
  FileText, ChevronRight, Loader2, Share2, Zap,
  DollarSign, CheckCircle, BarChart3, Star, Trophy, Medal
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
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

const COMM_STATUS_COLORS = {
  expected: "text-blue-600 bg-blue-50",
  pending: "text-yellow-600 bg-yellow-50",
  pending_payout: "text-orange-600 bg-orange-50",
  approved: "text-green-600 bg-green-50",
  paid: "text-emerald-700 bg-emerald-50",
};

const PIPELINE_STAGES = [
  { key: "new_leads", label: "New", color: "bg-slate-200 text-slate-700", hoverColor: "hover:bg-slate-300" },
  { key: "contacted", label: "Contacted", color: "bg-blue-100 text-blue-700", hoverColor: "hover:bg-blue-200" },
  { key: "quoted", label: "Quoted", color: "bg-yellow-100 text-yellow-700", hoverColor: "hover:bg-yellow-200" },
  { key: "approved", label: "Approved", color: "bg-orange-100 text-orange-700", hoverColor: "hover:bg-orange-200" },
  { key: "paid", label: "Paid", color: "bg-green-100 text-green-700", hoverColor: "hover:bg-green-200" },
  { key: "fulfilled", label: "Fulfilled", color: "bg-emerald-100 text-emerald-800", hoverColor: "hover:bg-emerald-200" },
];

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
        <AppLoader text="Loading sales dashboard..." size="md" />
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

  const {
    kpis, today_actions, pipeline, recent_orders,
    assigned_customers, staff_name, commission_summary, charts,
    avg_rating, total_ratings, recent_ratings, leaderboard,
  } = data;

  return (
    <div className="space-y-5" data-testid="sales-dashboard-v2">
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3" data-testid="kpi-row">
        <KpiCard
          label="Today's Revenue"
          value={shortMoney(kpis?.today_revenue)}
          sub={`${kpis?.today_orders || 0} order${kpis?.today_orders !== 1 ? "s" : ""}`}
          icon={<TrendingUp className="w-5 h-5" />}
          accent="text-emerald-600"
          testId="kpi-today-revenue"
        />
        <KpiCard
          label="This Month"
          value={shortMoney(kpis?.month_revenue)}
          sub={`${kpis?.month_orders || 0} orders`}
          icon={<Target className="w-5 h-5" />}
          accent="text-blue-600"
          testId="kpi-month-revenue"
        />
        <KpiCard
          label="Open Pipeline"
          value={shortMoney(kpis?.pipeline_value)}
          sub={`${kpis?.open_orders || 0} open deals`}
          icon={<ShoppingCart className="w-5 h-5" />}
          accent="text-orange-600"
          testId="kpi-pipeline"
        />
        <KpiCard
          label="Commission"
          value={shortMoney(kpis?.total_earned)}
          sub={kpis?.pending_payout > 0 ? `${shortMoney(kpis?.pending_payout)} pending` : "No pending"}
          icon={<Wallet className="w-5 h-5" />}
          accent="text-[#D4A843]"
          testId="kpi-commission"
        />
        <KpiCard
          label="Avg Rating"
          value={avg_rating > 0 ? `${avg_rating} / 5` : "—"}
          sub={total_ratings > 0 ? `${total_ratings} rating${total_ratings !== 1 ? "s" : ""}` : "No ratings yet"}
          icon={<Star className="w-5 h-5" />}
          accent="text-[#D4A843]"
          testId="kpi-avg-rating"
        />
      </div>

      {/* ═══ TODAY'S ACTIONS (TOP PRIORITY — above pipeline) ═══ */}
      <TodayActionsSection actions={today_actions || []} />

      {/* ═══ PIPELINE FUNNEL (actionable) ═══ */}
      <PipelineSection pipeline={pipeline || {}} />

      {/* ═══ COMMISSION SUMMARY ═══ */}
      <CommissionSummarySection summary={commission_summary || {}} />

      {/* ═══ LEADERBOARD + RECENT RATINGS ═══ */}
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <LeaderboardSection leaderboard={leaderboard || []} staffName={staff_name} />
        </div>
        <div className="lg:col-span-2">
          <RecentRatingsSection ratings={recent_ratings || []} avgRating={avg_rating} />
        </div>
      </div>

      {/* ═══ CRM + CONTENT ═══ */}
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <CRMSection customers={assigned_customers || []} />
        </div>
        <div className="lg:col-span-3">
          <SalesContentBlock />
        </div>
      </div>

      {/* ═══ COMMISSION PER ORDER TABLE ═══ */}
      <CommissionTableSection orders={recent_orders || []} />

      {/* ═══ TREND CHARTS (max 3) ═══ */}
      <TrendChartsSection charts={charts || {}} />
    </div>
  );
}


/* ═══════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════ */

function TodayActionsSection({ actions }) {
  return (
    <div className="bg-white border rounded-xl p-5" data-testid="today-actions-section">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-red-500 text-white flex items-center justify-center">
          <Zap className="w-3.5 h-3.5" />
        </div>
        <h2 className="text-base font-bold text-[#0f172a]">
          Today's Sales Actions
        </h2>
        {actions.length > 0 && (
          <span className="ml-1 text-xs font-semibold text-white bg-red-500 px-2 py-0.5 rounded-full">{actions.length}</span>
        )}
      </div>
      {actions.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
          <p className="text-sm font-medium text-green-600">All caught up! No pending actions.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {actions.map((action, i) => {
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
  );
}

function PipelineSection({ pipeline }) {
  return (
    <div className="bg-white border rounded-xl p-5" data-testid="pipeline-section">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-[#0f172a]">Sales Pipeline</h2>
        <Link to="/staff/portfolio" className="text-xs text-slate-500 hover:text-[#0f172a] transition flex items-center gap-1">
          View CRM <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex items-center gap-1" data-testid="pipeline-funnel">
        {PIPELINE_STAGES.map((stage, i, arr) => {
          const count = pipeline[stage.key] || 0;
          const value = pipeline.values?.[stage.key] || 0;
          return (
            <React.Fragment key={stage.key}>
              <Link
                to="/staff/orders"
                className={`flex-1 ${stage.color} ${stage.hoverColor} rounded-lg py-3 px-2 text-center transition cursor-pointer group`}
                data-testid={`pipeline-stage-${stage.label.toLowerCase()}`}
              >
                <div className="text-lg font-bold group-hover:scale-110 transition-transform">{count}</div>
                <div className="text-[10px] font-medium uppercase tracking-wide">{stage.label}</div>
                {value > 0 && (
                  <div className="text-[9px] font-semibold mt-0.5 opacity-70">{shortMoney(value)}</div>
                )}
              </Link>
              {i < arr.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function CommissionSummarySection({ summary }) {
  return (
    <div className="grid grid-cols-3 gap-3" data-testid="commission-summary">
      <div className="bg-white border rounded-xl p-4 text-center" data-testid="comm-expected">
        <DollarSign className="w-5 h-5 text-blue-500 mx-auto mb-1.5" />
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Expected</p>
        <p className="text-lg font-bold text-blue-600 mt-0.5">{shortMoney(summary.expected)}</p>
      </div>
      <div className="bg-white border rounded-xl p-4 text-center" data-testid="comm-pending">
        <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pending Payout</p>
        <p className="text-lg font-bold text-amber-600 mt-0.5">{shortMoney(summary.pending)}</p>
      </div>
      <div className="bg-white border rounded-xl p-4 text-center" data-testid="comm-paid">
        <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Paid</p>
        <p className="text-lg font-bold text-emerald-600 mt-0.5">{shortMoney(summary.paid)}</p>
      </div>
    </div>
  );
}

function CRMSection({ customers }) {
  return (
    <div className="bg-white border rounded-xl p-5 h-full" data-testid="crm-section">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-[#0f172a]">
          My Customers
          <span className="ml-1.5 text-xs font-normal text-slate-400">({customers.length})</span>
        </h2>
        <Link to="/staff/portfolio" className="text-xs text-slate-500 hover:text-[#0f172a] transition flex items-center gap-1">
          All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      {customers.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Users className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">No assigned customers yet.</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
          {customers.slice(0, 15).map((cust) => (
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
  );
}

function CommissionTableSection({ orders }) {
  return (
    <div className="bg-white border rounded-xl p-5" data-testid="commission-table-section">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-[#0f172a]">Commission per Order</h2>
      </div>
      {orders.length === 0 ? (
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
              {orders.slice(0, 10).map((order) => (
                <tr key={order.order_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition" data-testid={`commission-row-${order.order_number}`}>
                  <td className="py-2.5">
                    <span className="font-mono text-xs text-slate-600">{order.order_number}</span>
                  </td>
                  <td className="py-2.5 text-slate-700">{order.customer_name}</td>
                  <td className="py-2.5 text-right font-medium text-slate-800">{money(order.total)}</td>
                  <td className="py-2.5 text-right font-bold text-[#D4A843]">{money(order.commission_amount)}</td>
                  <td className="py-2.5 text-center">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${COMM_STATUS_COLORS[order.commission_status] || COMM_STATUS_COLORS.expected}`}>
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
  );
}

function TrendChartsSection({ charts }) {
  const pipelineTrend = charts?.pipeline_trend || [];
  const dealsTrend = charts?.deals_closed_trend || [];
  const commissionTrend = charts?.commission_trend || [];

  return (
    <div className="grid md:grid-cols-3 gap-4" data-testid="trend-charts">
      {/* Pipeline Value Trend */}
      <div className="bg-white border rounded-xl p-5" data-testid="chart-pipeline-trend">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-[#20364D]" />
          <h3 className="font-semibold text-[#20364D] text-sm">Pipeline Value</h3>
        </div>
        {pipelineTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={pipelineTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} />
              <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 12 }} formatter={(v) => [shortMoney(v), "Pipeline"]} />
              <Area type="monotone" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[160px] flex items-center justify-center text-slate-400 text-sm">No data yet</div>
        )}
      </div>

      {/* Deals Closed Trend */}
      <div className="bg-white border rounded-xl p-5" data-testid="chart-deals-trend">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[#20364D]" />
          <h3 className="font-semibold text-[#20364D] text-sm">Deals Closed</h3>
        </div>
        {dealsTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={dealsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 12 }} formatter={(v, name) => [name === "count" ? v : shortMoney(v), name === "count" ? "Deals" : "Value"]} />
              <Bar dataKey="count" fill="#20364D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[160px] flex items-center justify-center text-slate-400 text-sm">No data yet</div>
        )}
      </div>

      {/* Commission Trend */}
      <div className="bg-white border rounded-xl p-5" data-testid="chart-commission-trend">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4 text-[#D4A843]" />
          <h3 className="font-semibold text-[#20364D] text-sm">Commission Trend</h3>
        </div>
        {commissionTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={commissionTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} />
              <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 12 }} formatter={(v) => [shortMoney(v), "Commission"]} />
              <Line type="monotone" dataKey="amount" stroke="#D4A843" strokeWidth={2.5} dot={{ r: 4, fill: "#D4A843" }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[160px] flex items-center justify-center text-slate-400 text-sm">No data yet</div>
        )}
      </div>
    </div>
  );
}


/* ═══ SHARED COMPONENTS ═══ */

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


function LeaderboardSection({ leaderboard, staffName }) {
  const RANK_ICONS = [Trophy, Medal, Medal];
  const RANK_COLORS = ["text-[#D4A843]", "text-slate-400", "text-amber-700"];

  return (
    <div className="bg-white border rounded-xl p-5" data-testid="leaderboard-section">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-[#D4A843] text-white flex items-center justify-center">
          <Trophy className="w-3.5 h-3.5" />
        </div>
        <h2 className="text-base font-bold text-[#0f172a]">Sales Leaderboard</h2>
      </div>

      {leaderboard.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No leaderboard data yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-slate-400 uppercase tracking-wider border-b">
                <th className="pb-2 text-left w-10">#</th>
                <th className="pb-2 text-left">Rep</th>
                <th className="pb-2 text-right">Deals</th>
                <th className="pb-2 text-right">Commission</th>
                <th className="pb-2 text-right">Rating</th>
                <th className="pb-2 text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => {
                const RankIcon = RANK_ICONS[entry.rank - 1];
                const rankColor = RANK_COLORS[entry.rank - 1] || "text-slate-500";
                const isMe = entry.name === staffName;
                const labelColors = {
                  "Top Performer": "bg-emerald-100 text-emerald-700",
                  "Strong": "bg-blue-100 text-blue-700",
                  "Improving": "bg-amber-100 text-amber-700",
                  "Needs Attention": "bg-red-100 text-red-700",
                };

                return (
                  <tr
                    key={entry.rank}
                    className={`border-b border-slate-50 last:border-0 ${isMe ? "bg-[#D4A843]/5" : ""}`}
                    data-testid={`leaderboard-row-${entry.rank}`}
                  >
                    <td className="py-2.5">
                      {RankIcon ? (
                        <RankIcon className={`w-4.5 h-4.5 ${rankColor}`} />
                      ) : (
                        <span className="text-xs font-bold text-slate-400">{entry.rank}</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <span className={`font-semibold ${isMe ? "text-[#D4A843]" : "text-[#20364D]"}`}>
                        {entry.name}{isMe ? " (You)" : ""}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-semibold text-[#20364D]">{entry.deals}</td>
                    <td className="py-2.5 text-right text-[#D4A843] font-semibold">{shortMoney(entry.commission)}</td>
                    <td className="py-2.5 text-right">
                      {entry.avg_rating > 0 ? (
                        <span className="inline-flex items-center gap-0.5">
                          <Star className="w-3.5 h-3.5 fill-[#D4A843] text-[#D4A843]" />
                          <span className="text-xs font-semibold text-slate-600">{entry.avg_rating}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${labelColors[entry.label] || "bg-slate-100 text-slate-500"}`}>
                        {entry.label || "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


function RecentRatingsSection({ ratings, avgRating }) {
  return (
    <div className="bg-white border rounded-xl p-5" data-testid="recent-ratings-section">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-[#D4A843]/20 text-[#D4A843] flex items-center justify-center">
          <Star className="w-3.5 h-3.5" />
        </div>
        <h2 className="text-base font-bold text-[#0f172a]">Recent Ratings</h2>
        {avgRating > 0 && (
          <span className="ml-auto text-xs font-semibold text-[#D4A843] bg-[#D4A843]/10 px-2 py-0.5 rounded-full">
            Avg: {avgRating}/5
          </span>
        )}
      </div>

      {ratings.length === 0 ? (
        <div className="text-center py-6">
          <Star className="w-8 h-8 mx-auto mb-2 text-slate-200" />
          <p className="text-sm text-slate-400">No ratings received yet.</p>
          <p className="text-xs text-slate-300 mt-1">Ratings appear after completed orders.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ratings.map((r, i) => {
            const isNeg = r.stars <= 2;
            return (
            <div key={i} className={`border-b pb-3 last:border-0 last:pb-0 ${isNeg ? "border-b-red-100" : "border-slate-50"}`} data-testid={`rating-item-${i}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${s <= r.stars ? (isNeg ? "fill-red-400 text-red-400" : "fill-[#D4A843] text-[#D4A843]") : "text-slate-200"}`}
                    />
                  ))}
                </div>
                {isNeg && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">LOW</span>}
                <span className="ml-auto text-[10px] text-slate-400">
                  {(r.rated_at || "").slice(0, 10)}
                </span>
              </div>
              <p className="text-xs font-semibold text-[#20364D]">{r.customer_name}</p>
              <p className="text-[10px] text-slate-400">#{r.order_number}</p>
              {r.comment && (
                <p className={`text-xs italic mt-1 ${isNeg ? "text-red-600" : "text-slate-500"}`}>"{r.comment}"</p>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
