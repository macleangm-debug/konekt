import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import {
  DollarSign, ShoppingCart, Clock, AlertTriangle,
  TrendingUp, CheckCircle, Package, ArrowRight,
  Settings, FileText, Users, UserCheck, CreditCard,
  Truck, Activity, BarChart3, Layers, Trophy,
  Star, ShieldAlert, BadgePercent, Target
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

function fmtMoney(v) {
  if (v >= 1e6) return `TZS ${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `TZS ${(v / 1e3).toFixed(0)}K`;
  return `TZS ${Number(v || 0).toLocaleString()}`;
}

const STATUS_COLORS = [
  "#20364D", "#D4A843", "#3B82F6", "#8B5CF6",
  "#10B981", "#F59E0B", "#EF4444", "#6366F1",
  "#14B8A6", "#EC4899"
];

function KpiCard({ icon: Icon, label, value, color, to, trend, badge }) {
  const Wrapper = to ? Link : "div";
  return (
    <Wrapper to={to} className={`bg-white border rounded-2xl p-5 hover:shadow-lg transition group ${to ? "cursor-pointer" : ""}`} data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center group-hover:scale-105 transition`}>
          <Icon className="w-5 h-5" />
        </div>
        {badge !== undefined && badge > 0 && (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700">{badge}</span>
        )}
        {trend && <TrendingUp className="w-4 h-4 text-green-500" />}
      </div>
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-[#20364D] mt-0.5">{value}</p>
    </Wrapper>
  );
}

function SnapshotRow({ icon: Icon, label, value, sub, to }) {
  const Wrapper = to ? Link : "div";
  return (
    <Wrapper to={to} className={`flex items-center justify-between py-3 border-b border-slate-50 last:border-0 ${to ? "hover:bg-slate-50 cursor-pointer" : ""} transition rounded-lg px-2`}>
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-slate-400" />
        <div>
          <span className="text-sm text-slate-700 font-medium">{label}</span>
          {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
      </div>
      <span className="text-sm font-bold text-[#20364D]">{value}</span>
    </Wrapper>
  );
}

/* ═══ Sales Manager Dashboard ═══ */
function SalesManagerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/api/admin/dashboard/team-kpis");
        setData(res.data);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="sm-dashboard-loading">
        <div className="animate-pulse text-slate-400 text-sm">Loading team dashboard...</div>
      </div>
    );
  }

  const tk = data?.team_kpis || {};
  const teamTable = data?.team_table || [];
  const pipeline = data?.pipeline_overview || [];
  const leaderboard = data?.leaderboard || [];
  const lowRatings = data?.low_rating_details || [];
  const criticalDiscounts = data?.critical_discount_details || [];

  const PIPELINE_COLORS = [
    "#F59E0B", "#3B82F6", "#10B981", "#8B5CF6",
    "#20364D", "#D4A843", "#EF4444", "#6366F1",
    "#14B8A6", "#EC4899", "#84CC16"
  ];

  return (
    <div className="space-y-6" data-testid="sales-manager-dashboard">
      {/* Hero */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-900 text-white rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Team Command Center</h1>
            <p className="text-teal-200 mt-1 text-sm">Monitor performance, quality, and pipeline health</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-white/15 px-3 py-1.5 rounded-lg text-xs font-medium">
              {tk.total_reps || 0} Reps Active
            </span>
          </div>
        </div>
      </div>

      {/* Team KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4" data-testid="sm-kpi-row">
        <KpiCard icon={ShoppingCart} label="Team Deals" value={tk.team_deals || 0} color="bg-blue-50 text-blue-600" to="/admin/orders" />
        <KpiCard icon={DollarSign} label="Revenue (Month)" value={fmtMoney(tk.team_revenue_month)} color="bg-green-50 text-green-600" trend />
        <KpiCard icon={Star} label="Avg Rating" value={tk.avg_rating || "—"} color="bg-amber-50 text-amber-600" to="/admin/sales-ratings" />
        <KpiCard icon={Target} label="Pipeline Value" value={fmtMoney(tk.pipeline_value)} color="bg-purple-50 text-purple-600" to="/admin/orders" />
        <KpiCard icon={ShieldAlert} label="Critical Discounts" value={tk.critical_discount_alerts || 0} color="bg-red-50 text-red-600" badge={tk.critical_discount_alerts} to="/admin/discount-analytics" />
        <KpiCard icon={AlertTriangle} label="Low Ratings" value={tk.low_rating_alerts || 0} color="bg-orange-50 text-orange-600" badge={tk.low_rating_alerts} to="/admin/sales-ratings" />
      </div>

      {/* Main Grid: Team Performance + Leaderboard */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Team Performance Table (2 cols wide) */}
        <div className="lg:col-span-2 bg-white border rounded-2xl p-5" data-testid="sm-team-table">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-700" />
              <h3 className="font-semibold text-[#20364D] text-sm">Team Performance</h3>
            </div>
            <Link to="/admin/team/overview" className="text-xs text-teal-600 font-semibold hover:underline flex items-center gap-1">
              Full View <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {teamTable.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No sales reps found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Rep</th>
                    <th className="text-center py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Deals</th>
                    <th className="text-right py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Revenue</th>
                    <th className="text-right py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Pipeline</th>
                    <th className="text-center py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Rating</th>
                    <th className="text-right py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {teamTable.map((rep) => (
                    <tr key={rep.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">
                            {(rep.name || "?").charAt(0)}
                          </div>
                          <span className="font-medium text-[#20364D] truncate max-w-[140px]">{rep.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-semibold text-slate-700">{rep.deals}</td>
                      <td className="py-2.5 px-2 text-right text-slate-600">{fmtMoney(rep.revenue)}</td>
                      <td className="py-2.5 px-2 text-right text-slate-600">{fmtMoney(rep.pipeline)}</td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                          rep.avg_rating >= 4 ? "text-green-600" :
                          rep.avg_rating >= 3 ? "text-amber-600" :
                          rep.avg_rating > 0 ? "text-red-600" : "text-slate-400"
                        }`}>
                          <Star className="w-3 h-3" /> {rep.avg_rating || "—"}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-medium text-emerald-600">{fmtMoney(rep.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Leaderboard (1 col) */}
        <div className="bg-white border rounded-2xl p-5" data-testid="sm-leaderboard">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-[#20364D] text-sm">Leaderboard</h3>
          </div>
          {leaderboard.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No data</div>
          ) : (
            <div className="space-y-2">
              {leaderboard.slice(0, 8).map((entry) => (
                <div key={entry.rank} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-slate-50 transition">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    entry.rank === 1 ? "bg-amber-100 text-amber-700" :
                    entry.rank === 2 ? "bg-slate-200 text-slate-700" :
                    entry.rank === 3 ? "bg-orange-100 text-orange-700" :
                    "bg-slate-100 text-slate-500"
                  }`}>
                    {entry.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#20364D] truncate">{entry.name}</p>
                    <p className="text-[10px] text-slate-400">{entry.deals} deals &middot; Score: {entry.score}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    entry.label === "Top Performer" ? "bg-green-100 text-green-700" :
                    entry.label === "Strong" ? "bg-blue-100 text-blue-700" :
                    entry.label === "Improving" ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  }`}>{entry.label}</span>
                </div>
              ))}
            </div>
          )}
          <Link to="/admin/team/leaderboard" className="block mt-3 text-center text-xs text-teal-600 font-semibold hover:underline">
            View Full Leaderboard
          </Link>
        </div>
      </div>

      {/* Pipeline Overview + Alerts */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Pipeline Overview */}
        <div className="lg:col-span-1 bg-white border rounded-2xl p-5" data-testid="sm-pipeline-overview">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-[#20364D]" />
            <h3 className="font-semibold text-[#20364D] text-sm">Pipeline Overview</h3>
          </div>
          {pipeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pipeline} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 10, fill: "#94a3b8" }} width={90} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 12 }}
                  formatter={(v, name) => [name === "value" ? fmtMoney(v) : v, name === "value" ? "Value" : "Count"]}
                />
                <Bar dataKey="count" fill="#20364D" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">No pipeline data</div>
          )}
        </div>

        {/* Low Rating Alerts */}
        <div className="bg-white border rounded-2xl p-5" data-testid="sm-low-rating-alerts">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h3 className="font-semibold text-[#20364D] text-sm">Low Rating Alerts</h3>
            {lowRatings.length > 0 && (
              <span className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-700">{lowRatings.length}</span>
            )}
          </div>
          {lowRatings.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-300" />
              <p className="text-sm text-slate-400">No low ratings — great job!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {lowRatings.map((alert, i) => (
                <div key={i} className="border-l-2 border-orange-400 pl-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#20364D]">{alert.rep_name}</span>
                    <span className="text-xs text-orange-600 font-semibold flex items-center gap-0.5">
                      <Star className="w-3 h-3" /> {alert.stars}/5
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Order {alert.order_number} &middot; {alert.customer_name}
                  </p>
                  {alert.comment && <p className="text-xs text-slate-400 italic mt-0.5">"{alert.comment}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Critical Discount Alerts */}
        <div className="bg-white border rounded-2xl p-5" data-testid="sm-discount-alerts">
          <div className="flex items-center gap-2 mb-4">
            <BadgePercent className="w-4 h-4 text-red-500" />
            <h3 className="font-semibold text-[#20364D] text-sm">Critical Discount Requests</h3>
            {criticalDiscounts.length > 0 && (
              <span className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700">{criticalDiscounts.length}</span>
            )}
          </div>
          {criticalDiscounts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-300" />
              <p className="text-sm text-slate-400">No critical discount requests</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {criticalDiscounts.map((d, i) => (
                <div key={i} className="border-l-2 border-red-400 pl-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#20364D]">{d.requested_by || "Unknown"}</span>
                    <span className="text-xs text-red-600 font-bold">{d.discount_percent}%</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Customer: {d.customer_name || "—"}</p>
                </div>
              ))}
            </div>
          )}
          <Link to="/admin/discount-analytics" className="block mt-3 text-center text-xs text-teal-600 font-semibold hover:underline">
            View All Discount Analytics
          </Link>
        </div>
      </div>

      {/* Quick Actions for Sales Manager */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/admin/orders" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="sm-quick-orders">
          <ShoppingCart className="w-4 h-4 text-teal-700" /> Orders
        </Link>
        <Link to="/admin/customers" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="sm-quick-customers">
          <Users className="w-4 h-4 text-teal-700" /> Customers
        </Link>
        <Link to="/admin/quotes" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="sm-quick-quotes">
          <FileText className="w-4 h-4 text-teal-700" /> Quotes
        </Link>
        <Link to="/admin/sales-ratings" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="sm-quick-ratings">
          <Star className="w-4 h-4 text-teal-700" /> Sales Ratings
        </Link>
      </div>
    </div>
  );
}

export default function AdminDashboardV2() {
  const { admin } = useAdminAuth();
  const role = admin?.role || "admin";

  if (role === "sales_manager") {
    return <SalesManagerDashboard />;
  }

  return <AdminDashboardMain />;
}

function AdminDashboardMain() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [kpiRes, ordersRes] = await Promise.all([
        api.get("/api/admin/dashboard/kpis").catch(() => ({ data: {} })),
        api.get("/api/orders?limit=5").catch(() => ({ data: [] })),
      ]);
      setData(kpiRes.data);
      const orders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
      setRecentOrders(orders.slice(0, 5));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="admin-dashboard-loading">
        <div className="animate-pulse text-slate-400 text-sm">Loading dashboard...</div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const ops = data?.operations || {};
  const fin = data?.finance || {};
  const comm = data?.commercial || {};
  const parts = data?.partners || {};
  const team = data?.team || {};
  const charts = data?.charts || {};
  const sc = ops.status_counts || {};

  return (
    <div className="space-y-6" data-testid="admin-dashboard-v2">
      {/* Hero Header */}
      <div className="bg-[#20364D] text-white rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Control Center</h1>
            <p className="text-slate-300 mt-1 text-sm">What needs oversight and action now</p>
          </div>
          <Link to="/admin/settings-hub" className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-xl hover:bg-white/20 transition text-sm font-medium w-fit">
            <Settings className="w-4 h-4" /> Settings
          </Link>
        </div>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4" data-testid="kpi-row">
        <KpiCard icon={ShoppingCart} label="Orders Today" value={kpis.orders_today || 0} color="bg-blue-50 text-blue-600" to="/admin/orders" />
        <KpiCard icon={DollarSign} label="Revenue (Month)" value={fmtMoney(kpis.revenue_month)} color="bg-green-50 text-green-600" trend />
        <KpiCard icon={CreditCard} label="Pending Payments" value={kpis.pending_payments || 0} color="bg-amber-50 text-amber-600" to="/admin/payments" badge={kpis.pending_payments} />
        <KpiCard icon={FileText} label="Active Quotes" value={kpis.active_quotes || 0} color="bg-purple-50 text-purple-600" to="/admin/quotes" />
        <KpiCard icon={AlertTriangle} label="Open Delays" value={kpis.open_delays || 0} color="bg-red-50 text-red-600" to="/admin/orders" badge={kpis.open_delays} />
        <KpiCard icon={CheckCircle} label="Pending Approvals" value={kpis.pending_approvals || 0} color="bg-teal-50 text-teal-600" to="/admin/payments" />
      </div>

      {/* Snapshots Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Operations Snapshot */}
        <div className="bg-white border rounded-2xl p-5" data-testid="snapshot-operations">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-[#20364D]" />
            <h3 className="font-semibold text-[#20364D] text-sm">Operations</h3>
          </div>
          <SnapshotRow icon={Clock} label="Pending" value={sc.pending || 0} to="/admin/orders" />
          <SnapshotRow icon={Layers} label="In Production" value={(sc.in_production || 0) + (sc.in_progress || 0)} to="/admin/orders" />
          <SnapshotRow icon={Truck} label="Dispatched" value={(sc.dispatched || 0) + (sc.in_transit || 0)} />
          <SnapshotRow icon={CheckCircle} label="Completed" value={(sc.delivered || 0) + (sc.completed || 0)} />
          <SnapshotRow icon={AlertTriangle} label="Delayed" value={sc.delayed || 0} sub={sc.delayed > 0 ? "Needs attention" : ""} />
        </div>

        {/* Finance Snapshot */}
        <div className="bg-white border rounded-2xl p-5" data-testid="snapshot-finance">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-[#20364D]" />
            <h3 className="font-semibold text-[#20364D] text-sm">Finance</h3>
          </div>
          <SnapshotRow icon={FileText} label="Invoices (Month)" value={fin.invoices_this_month || 0} to="/admin/invoices" />
          <SnapshotRow icon={FileText} label="Total Invoices" value={fin.total_invoices || 0} to="/admin/invoices" />
          <SnapshotRow icon={DollarSign} label="Outstanding" value={fmtMoney(fin.outstanding_amount)} />
          <SnapshotRow icon={CreditCard} label="Payments Pending" value={kpis.pending_payments || 0} to="/admin/payments" />
        </div>

        {/* Commercial Snapshot */}
        <div className="bg-white border rounded-2xl p-5" data-testid="snapshot-commercial">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-[#20364D]" />
            <h3 className="font-semibold text-[#20364D] text-sm">Commercial</h3>
          </div>
          <SnapshotRow icon={TrendingUp} label="Active Promotions" value={comm.active_promotions || 0} to="/admin/promotion-engine" />
          <SnapshotRow icon={FileText} label="Discount Requests" value={comm.pending_discount_requests || 0} sub={comm.pending_discount_requests > 0 ? "Pending review" : ""} />
          <SnapshotRow icon={ShoppingCart} label="Total Orders" value={ops.total_orders || 0} to="/admin/orders" />
          <SnapshotRow icon={FileText} label="Active Quotes" value={kpis.active_quotes || 0} to="/admin/quotes" />
        </div>

        {/* Partner Snapshot */}
        <div className="bg-white border rounded-2xl p-5" data-testid="snapshot-partners">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-[#20364D]" />
            <h3 className="font-semibold text-[#20364D] text-sm">Partners & Team</h3>
          </div>
          <SnapshotRow icon={UserCheck} label="Active Vendors" value={parts.active_vendors || 0} to="/admin/partner-ecosystem" />
          <SnapshotRow icon={Users} label="Affiliates" value={parts.total_affiliates || 0} to="/admin/affiliate-performance" />
          <SnapshotRow icon={Users} label="Customers" value={team.total_customers || 0} to="/admin/customers" />
          <SnapshotRow icon={UserCheck} label="Sales Staff" value={team.total_sales || 0} />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Orders Trend */}
        <div className="bg-white border rounded-2xl p-5" data-testid="chart-orders-trend">
          <h3 className="font-semibold text-[#20364D] text-sm mb-4">Orders Trend (14 days)</h3>
          {charts.orders_trend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={charts.orders_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 12 }} />
                <Bar dataKey="orders" fill="#20364D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-slate-400 text-sm">No data yet</div>
          )}
        </div>

        {/* Revenue Trend */}
        <div className="bg-white border rounded-2xl p-5" data-testid="chart-revenue-trend">
          <h3 className="font-semibold text-[#20364D] text-sm mb-4">Revenue Trend (6 months)</h3>
          {charts.revenue_trend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={charts.revenue_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 12 }} formatter={(v) => [fmtMoney(v), "Revenue"]} />
                <Line type="monotone" dataKey="revenue" stroke="#D4A843" strokeWidth={2.5} dot={{ r: 4, fill: "#D4A843" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-slate-400 text-sm">No data yet</div>
          )}
        </div>

        {/* Status Distribution */}
        <div className="bg-white border rounded-2xl p-5" data-testid="chart-status-distribution">
          <h3 className="font-semibold text-[#20364D] text-sm mb-4">Order Status Distribution</h3>
          {charts.status_distribution?.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={charts.status_distribution} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                    {charts.status_distribution.map((_, i) => (
                      <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {charts.status_distribution.slice(0, 6).map((item, i) => (
                  <div key={item.status} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                    <span className="text-slate-600 truncate">{item.status}</span>
                    <span className="ml-auto font-bold text-slate-700">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-slate-400 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white border rounded-2xl p-5" data-testid="recent-orders">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#20364D] text-sm">Recent Orders</h3>
          <Link to="/admin/orders" className="text-xs text-[#D4A843] font-semibold hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="text-center py-6"><Package className="w-8 h-8 mx-auto mb-2 text-slate-300" /><p className="text-sm text-slate-400">No orders yet</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Order</th>
                  <th className="text-left py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer</th>
                  <th className="text-left py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-right py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id || o.order_number} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="py-2.5 px-2">
                      <span className="font-medium text-[#20364D]">#{(o.order_number || o.id || "").slice(-8)}</span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-600">{o.customer_name || "N/A"}</td>
                    <td className="py-2.5 px-2">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                        o.status === "delivered" || o.status === "completed" ? "bg-green-100 text-green-700" :
                        o.status === "in_production" || o.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                        o.status === "delayed" ? "bg-red-100 text-red-700" :
                        o.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                        o.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>{(o.status || "").replace(/_/g, " ")}</span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-medium text-slate-700">TZS {(o.total || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/admin/orders" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700">
          <ShoppingCart className="w-4 h-4 text-[#20364D]" /> Orders
        </Link>
        <Link to="/admin/payments" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700">
          <CreditCard className="w-4 h-4 text-[#20364D]" /> Payments
        </Link>
        <Link to="/admin/partner-ecosystem" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700">
          <UserCheck className="w-4 h-4 text-[#20364D]" /> Partners
        </Link>
        <Link to="/admin/catalog-setup" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700">
          <Package className="w-4 h-4 text-[#20364D]" /> Catalog
        </Link>
      </div>
    </div>
  );
}
