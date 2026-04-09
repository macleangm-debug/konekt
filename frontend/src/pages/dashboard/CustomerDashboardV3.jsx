import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import {
  ShoppingCart, FileText, Receipt, Gift,
  ArrowRight, Package, AlertCircle, Bell, Copy,
  CheckCircle, Clock, TrendingUp, Palette, Truck
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

function fmtMoney(v) {
  if (v >= 1e6) return `TZS ${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `TZS ${(v / 1e3).toFixed(0)}K`;
  return `TZS ${Number(v || 0).toLocaleString()}`;
}

const statusMeta = {
  processing: { cls: "bg-blue-100 text-blue-700", icon: Clock },
  confirmed: { cls: "bg-blue-100 text-blue-700", icon: CheckCircle },
  "in fulfillment": { cls: "bg-amber-100 text-amber-700", icon: Package },
  dispatched: { cls: "bg-indigo-100 text-indigo-700", icon: Truck },
  delivered: { cls: "bg-green-100 text-green-700", icon: CheckCircle },
  completed: { cls: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  delayed: { cls: "bg-red-100 text-red-700", icon: AlertCircle },
};

export default function CustomerDashboardV3() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUserName((localStorage.getItem("userName") || "there").split(" ")[0]);
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const userId = localStorage.getItem("userId") || "";
      const res = await api.get(`/api/dashboard-metrics/customer?user_id=${userId}`);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (data?.referral?.code) {
      navigator.clipboard.writeText(data.referral.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="customer-dashboard-loading">
        <div className="animate-pulse text-slate-400 text-sm">Loading your dashboard...</div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const activeOrders = data?.active_orders || [];
  const reminders = data?.reminders || [];
  const ref = data?.referral || {};
  const charts = data?.charts || {};

  return (
    <div className="space-y-5" data-testid="customer-dashboard-v3">
      {/* Hero Header */}
      <div className="bg-[#20364D] text-white rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Welcome back, {userName}!</h1>
            <p className="text-slate-300 text-sm mt-1">What's happening with your orders and what to do next</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link to="/account/marketplace" className="flex items-center gap-2 bg-white text-[#20364D] px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-100 transition" data-testid="browse-products-btn">
              <Package className="w-4 h-4" /> Browse Products
            </Link>
            <Link to="/account/marketplace?tab=services" className="flex items-center gap-2 bg-[#D4A843] text-[#20364D] px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#c99b38] transition" data-testid="request-service-btn">
              <Palette className="w-4 h-4" /> Request Service
            </Link>
          </div>
        </div>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="customer-kpi-row">
        <Link to="/account/orders" className="bg-white border rounded-2xl p-4 hover:shadow-lg transition group" data-testid="kpi-active-orders">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mb-2.5">
            <ShoppingCart className="w-4.5 h-4.5 text-blue-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Active Orders</p>
          <p className="text-2xl font-bold text-[#20364D]">{kpis.active_orders || 0}</p>
        </Link>
        <Link to="/account/invoices" className="bg-white border rounded-2xl p-4 hover:shadow-lg transition group" data-testid="kpi-pending-invoices">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center mb-2.5">
            <Receipt className="w-4.5 h-4.5 text-amber-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Pending Invoices</p>
          <p className="text-2xl font-bold text-[#20364D]">{kpis.pending_invoices || 0}</p>
          {kpis.pending_amount > 0 && <p className="text-[10px] text-amber-600 font-semibold mt-0.5">{fmtMoney(kpis.pending_amount)} due</p>}
        </Link>
        <Link to="/account/referrals" className="bg-white border rounded-2xl p-4 hover:shadow-lg transition group" data-testid="kpi-referral-wallet">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center mb-2.5">
            <Gift className="w-4.5 h-4.5 text-green-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Referral Balance</p>
          <p className="text-2xl font-bold text-[#20364D]">{fmtMoney(ref.balance || 0)}</p>
          {ref.code && <p className="text-[10px] text-green-600 font-semibold mt-0.5">Up to 10% off next order</p>}
        </Link>
        <Link to="/account/quotes" className="bg-white border rounded-2xl p-4 hover:shadow-lg transition group" data-testid="kpi-quotes">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center mb-2.5">
            <FileText className="w-4.5 h-4.5 text-purple-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Active Quotes</p>
          <p className="text-2xl font-bold text-[#20364D]">{kpis.total_quotes || 0}</p>
          {kpis.pending_quotes > 0 && <p className="text-[10px] text-purple-600 font-semibold mt-0.5">{kpis.pending_quotes} pending review</p>}
        </Link>
      </div>

      {/* Active Orders + Reminders */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Active Orders */}
        <div className="md:col-span-2 bg-white border rounded-2xl p-5" data-testid="active-orders-section">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#20364D] text-sm">My Active Orders</h3>
            <Link to="/account/orders" className="text-xs text-[#D4A843] font-semibold hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {activeOrders.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <p className="text-sm text-slate-400 font-medium">All caught up!</p>
              <Link to="/account/marketplace" className="text-xs text-[#D4A843] font-semibold mt-2 inline-block hover:underline">Start Shopping</Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeOrders.map((order) => {
                const st = order.customer_status || "processing";
                const meta = statusMeta[st] || statusMeta.processing;
                const StIcon = meta.icon;
                return (
                  <Link key={order.id || order.order_number} to={`/account/orders/${order.id}`} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition group" data-testid={`active-order-${order.order_number}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${meta.cls} flex items-center justify-center`}>
                        <StIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#20364D]">#{(order.order_number || "").slice(-8)}</p>
                        <p className="text-xs text-slate-400 capitalize">{st}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-700">{fmtMoney(order.total)}</span>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#D4A843] transition" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Reminders + Referral */}
        <div className="space-y-4">
          {/* Account Reminders */}
          {reminders.length > 0 && (
            <div className="bg-white border rounded-2xl p-4" data-testid="account-reminders">
              <h3 className="font-semibold text-[#20364D] text-sm flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4 text-amber-500" /> Action Needed
              </h3>
              <div className="space-y-2">
                {reminders.map((r, i) => (
                  <Link key={i} to={r.url} className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-50 border border-amber-100 hover:bg-amber-100 transition text-sm" data-testid={`reminder-${r.type}`}>
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-amber-800 font-medium truncate">{r.message}</p>
                    </div>
                    <span className="text-[10px] text-amber-700 font-semibold whitespace-nowrap">{r.cta} →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Referral Card */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4" data-testid="referral-card">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-4 h-4 text-green-600" />
              <h3 className="font-semibold text-green-800 text-sm">Referral Rewards</h3>
            </div>
            <div className="text-2xl font-bold text-green-700 mb-1">{fmtMoney(ref.balance || 0)}</div>
            <p className="text-xs text-green-600 mb-3">Usable up to 10% of next order</p>
            {ref.code && (
              <div className="flex items-center gap-2 bg-white rounded-lg border border-green-200 p-2">
                <code className="flex-1 text-sm font-mono text-green-700 font-bold">{ref.code}</code>
                <button onClick={copyCode} type="button" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-semibold hover:bg-green-200 transition" data-testid="copy-referral-code">
                  {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}
            <Link to="/account/referrals" className="text-xs text-green-700 font-semibold mt-2 inline-block hover:underline">View History →</Link>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-2xl p-5" data-testid="chart-order-trend">
          <h3 className="font-semibold text-[#20364D] text-sm mb-4">Order History (6 months)</h3>
          {charts.order_trend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={charts.order_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 12 }} />
                <Bar dataKey="orders" fill="#20364D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-slate-400 text-sm">No order history yet</div>
          )}
        </div>
        <div className="bg-white border rounded-2xl p-5" data-testid="chart-spend-trend">
          <h3 className="font-semibold text-[#20364D] text-sm mb-4">Spend Trend (6 months)</h3>
          {charts.spend_trend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={charts.spend_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 12 }} formatter={(v) => [fmtMoney(v), "Spend"]} />
                <Line type="monotone" dataKey="spend" stroke="#D4A843" strokeWidth={2.5} dot={{ r: 4, fill: "#D4A843" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-slate-400 text-sm">No spend data yet</div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/account/marketplace" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="qa-marketplace">
          <Package className="w-4 h-4 text-[#20364D]" /> Marketplace
        </Link>
        <Link to="/account/orders" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="qa-orders">
          <ShoppingCart className="w-4 h-4 text-[#20364D]" /> Track Orders
        </Link>
        <Link to="/account/assisted-quote" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="qa-sales">
          <FileText className="w-4 h-4 text-[#20364D]" /> Talk to Sales
        </Link>
        <Link to="/account/referrals" className="flex items-center gap-2.5 p-3.5 bg-white border rounded-xl hover:shadow-md transition text-sm font-medium text-slate-700" data-testid="qa-referrals">
          <Gift className="w-4 h-4 text-[#20364D]" /> Referrals
        </Link>
      </div>
    </div>
  );
}
