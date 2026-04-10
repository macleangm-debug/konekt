import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import partnerApi from "../../lib/partnerApi";
import AppLoader from "../../components/branding/AppLoader";
import NotificationPreferencesSection from "../../components/shared/NotificationPreferencesSection";
import {
  Briefcase, Clock, CheckCircle, AlertTriangle,
  Package, Truck, ChevronRight, Loader2,
  Flame, ArrowRight, DollarSign, Zap,
  BarChart3, TrendingUp
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

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
  hot: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "bg-red-500", icon: Flame },
  high: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", badge: "bg-orange-500", icon: AlertTriangle },
  medium: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", badge: "bg-yellow-500", icon: Clock },
  low: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-600", badge: "bg-slate-400", icon: Package },
};

const STATUS_BADGE = {
  assigned: "bg-blue-100 text-blue-700",
  accepted: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-purple-100 text-purple-700",
  processing: "bg-purple-100 text-purple-700",
  work_scheduled: "bg-indigo-100 text-indigo-700",
  ready_for_pickup: "bg-emerald-100 text-emerald-700",
  ready: "bg-emerald-100 text-emerald-700",
  delayed: "bg-red-100 text-red-700",
  delivered: "bg-green-100 text-green-700",
  completed: "bg-green-100 text-green-700",
  fulfilled: "bg-green-100 text-green-700",
};

const PIPELINE_STAGES = [
  { key: "assigned", label: "Assigned", color: "bg-blue-100 text-blue-700", hoverColor: "hover:bg-blue-200" },
  { key: "awaiting_ack", label: "Awaiting Ack", color: "bg-yellow-100 text-yellow-700", hoverColor: "hover:bg-yellow-200" },
  { key: "in_production", label: "In Production", color: "bg-purple-100 text-purple-700", hoverColor: "hover:bg-purple-200" },
  { key: "ready_to_dispatch", label: "Ready", color: "bg-emerald-100 text-emerald-700", hoverColor: "hover:bg-emerald-200" },
  { key: "delayed", label: "Delayed", color: "bg-red-100 text-red-700", hoverColor: "hover:bg-red-200" },
  { key: "delivered", label: "Delivered", color: "bg-green-100 text-green-700", hoverColor: "hover:bg-green-200" },
  { key: "completed", label: "Completed", color: "bg-teal-100 text-teal-800", hoverColor: "hover:bg-teal-200" },
];

export default function VendorDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await partnerApi.get("/api/partner-portal/dashboard");
      setData(res.data);
    } catch (err) {
      console.error("Failed to load vendor dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="vendor-dashboard-loading">
        <AppLoader text="Loading vendor dashboard..." size="md" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-slate-500" data-testid="vendor-dashboard-error">
        <p>Unable to load dashboard. Please refresh.</p>
      </div>
    );
  }

  const {
    partner, vendor_kpis, vendor_pipeline, work_requiring_action,
    recent_assignments, charts
  } = data;

  const kpis = vendor_kpis || {};
  const pipeline = vendor_pipeline || {};
  const actions = work_requiring_action || [];
  const assignments = recent_assignments || [];
  const trendCharts = charts || {};

  return (
    <div className="space-y-5" data-testid="vendor-dashboard-v2">
      {/* ═══ HEADER ═══ */}
      <div className="bg-[#20364D] text-white rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {partner?.name || "Vendor"} Dashboard
            </h1>
            <p className="text-slate-300 mt-1 text-sm">Fulfillment overview and work assignments</p>
          </div>
          <Link
            to="/partner/orders"
            className="flex items-center gap-2 bg-white text-[#20364D] px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-100 transition w-fit"
            data-testid="view-all-orders-btn"
          >
            <Truck className="w-4 h-4" /> All Orders
          </Link>
        </div>
      </div>

      {/* ═══ KPI ROW ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="vendor-kpi-row">
        <KpiCard
          icon={<Briefcase className="w-5 h-5" />}
          label="Active Jobs"
          value={kpis.active_jobs || 0}
          sub={`${kpis.total_jobs || 0} total`}
          color="text-blue-600"
          testId="kpi-active-jobs"
        />
        <KpiCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Completed"
          value={kpis.completed_jobs || 0}
          sub={kpis.total_jobs > 0 ? `${Math.round((kpis.completed_jobs / kpis.total_jobs) * 100)}% rate` : "—"}
          color="text-emerald-600"
          testId="kpi-completed"
        />
        <KpiCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Delayed"
          value={kpis.delayed || 0}
          sub={kpis.delayed > 0 ? "Needs attention" : "All on track"}
          color="text-red-600"
          badge={kpis.delayed > 0 ? kpis.delayed : null}
          testId="kpi-delayed"
        />
        <KpiCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Settlements"
          value={shortMoney(kpis.settlement_total)}
          sub={kpis.pending_settlement > 0 ? `${shortMoney(kpis.pending_settlement)} pending` : "All settled"}
          color="text-[#D4A843]"
          testId="kpi-settlements"
        />
      </div>

      {/* ═══ WORK REQUIRING ACTION (TOP PRIORITY) ═══ */}
      <WorkActionsSection actions={actions} />

      {/* ═══ FULFILLMENT PIPELINE ═══ */}
      <div className="bg-white border rounded-xl p-5" data-testid="vendor-pipeline-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#20364D]">Fulfillment Pipeline</h2>
          <Link to="/partner/orders" className="text-xs text-slate-500 hover:text-[#20364D] transition flex items-center gap-1">
            View All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto" data-testid="vendor-pipeline-funnel">
          {PIPELINE_STAGES.map((stage, i, arr) => {
            const count = pipeline[stage.key] || 0;
            return (
              <React.Fragment key={stage.key}>
                <Link
                  to="/partner/orders"
                  className={`flex-1 min-w-[80px] ${stage.color} ${stage.hoverColor} rounded-lg py-3 px-2 text-center transition cursor-pointer group`}
                  data-testid={`pipeline-${stage.key}`}
                >
                  <div className="text-lg font-bold group-hover:scale-110 transition-transform">{count}</div>
                  <div className="text-[9px] font-medium uppercase tracking-wide leading-tight">{stage.label}</div>
                </Link>
                {i < arr.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ═══ RECENT ASSIGNMENTS ═══ */}
      <RecentAssignmentsSection assignments={assignments} />

      {/* ═══ TREND CHARTS ═══ */}
      <TrendChartsSection charts={trendCharts} />

      {/* ═══ QUICK ACTIONS ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/partner/orders" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="qa-orders">
          <Truck className="w-4 h-4 text-[#20364D]" /> My Orders
        </Link>
        <Link to="/partner/catalog" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="qa-catalog">
          <Package className="w-4 h-4 text-[#20364D]" /> Catalog
        </Link>
        <Link to="/partner/settlements" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="qa-settlements">
          <DollarSign className="w-4 h-4 text-[#20364D]" /> Settlements
        </Link>
        <Link to="/partner/stock" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="qa-stock">
          <BarChart3 className="w-4 h-4 text-[#20364D]" /> Stock Table
        </Link>
      </div>

      {/* ═══ NOTIFICATION PREFERENCES ═══ */}
      <NotificationPreferencesSection apiClient={partnerApi} />
    </div>
  );
}


/* ═══ SUB-COMPONENTS ═══ */

function WorkActionsSection({ actions }) {
  return (
    <div className="bg-white border rounded-xl p-5" data-testid="work-actions-section">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-red-500 text-white flex items-center justify-center">
          <Zap className="w-3.5 h-3.5" />
        </div>
        <h2 className="text-base font-bold text-[#20364D]">Work Requiring Action</h2>
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
        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {actions.map((action, i) => {
            const cfg = URGENCY_CONFIG[action.urgency] || URGENCY_CONFIG.low;
            const Icon = cfg.icon;
            return (
              <Link
                key={i}
                to="/partner/orders"
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
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecentAssignmentsSection({ assignments }) {
  return (
    <div className="bg-white border rounded-xl p-5" data-testid="recent-assignments-section">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-[#20364D]">Recent Assignments</h2>
        <Link to="/partner/orders" className="text-xs text-slate-500 hover:text-[#20364D] transition flex items-center gap-1">
          View All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      {assignments.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Package className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">No assignments yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="assignments-table">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">Order</th>
                <th className="pb-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">Items</th>
                <th className="pb-2 text-xs font-semibold text-slate-600 uppercase tracking-wide text-right">Your Price</th>
                <th className="pb-2 text-xs font-semibold text-slate-600 uppercase tracking-wide text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {assignments.slice(0, 8).map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition" data-testid={`assignment-row-${a.vendor_order_no}`}>
                  <td className="py-2.5">
                    <span className="font-mono text-xs text-slate-600">{a.vendor_order_no}</span>
                  </td>
                  <td className="py-2.5 text-slate-700 text-xs">
                    {(a.items || []).map(i => i.name).join(", ") || "—"}
                  </td>
                  <td className="py-2.5 text-right font-medium text-[#20364D]">{money(a.base_price)}</td>
                  <td className="py-2.5 text-center">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[a.status] || "bg-slate-100 text-slate-600"}`}>
                      {(a.status || "").replace(/_/g, " ")}
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
  const fulfillmentTrend = charts?.fulfillment_trend || [];
  const deliveryPerf = charts?.delivery_performance || [];

  return (
    <div className="grid md:grid-cols-2 gap-4" data-testid="vendor-trend-charts">
      {/* Fulfillment Volume */}
      <div className="bg-white border rounded-xl p-5" data-testid="chart-fulfillment-trend">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-[#20364D]" />
          <h3 className="font-semibold text-[#20364D] text-sm">Fulfillment Volume (6 months)</h3>
        </div>
        {fulfillmentTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={fulfillmentTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="assigned" name="Assigned" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[180px] flex items-center justify-center text-slate-400 text-sm">No data yet</div>
        )}
      </div>

      {/* Delivery Performance */}
      <div className="bg-white border rounded-xl p-5" data-testid="chart-delivery-performance">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[#20364D]" />
          <h3 className="font-semibold text-[#20364D] text-sm">Delivery Performance (6 months)</h3>
        </div>
        {deliveryPerf.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={deliveryPerf}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="on_time" name="On Time" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="delayed" name="Delayed" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[180px] flex items-center justify-center text-slate-400 text-sm">No data yet</div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color, testId, badge }) {
  return (
    <div className="bg-white border rounded-xl p-4" data-testid={testId}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={color || "text-slate-400"}>{icon}</div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
        </div>
        {badge > 0 && (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700">{badge}</span>
        )}
      </div>
      <div className="text-xl font-bold text-[#20364D]">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}
