import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { Package, Palette, FileText, ShoppingCart, Receipt, TrendingUp, Clock, ArrowRight } from "lucide-react";

export default function DashboardCommandCenter() {
  const [stats, setStats] = useState({
    quotes: 0,
    orders: 0,
    invoices: 0,
    pending_quotes: 0,
    pending_orders: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const name = localStorage.getItem("userName") || "there";
    setUserName(name.split(" ")[0]);
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load stats
      const [quotesRes, ordersRes, invoicesRes] = await Promise.all([
        api.get("/api/customer/quotes").catch(() => ({ data: [] })),
        api.get("/api/customer/orders").catch(() => ({ data: [] })),
        api.get("/api/customer/invoices").catch(() => ({ data: [] })),
      ]);

      const quotes = quotesRes.data || [];
      const orders = ordersRes.data || [];
      const invoices = invoicesRes.data || [];

      setStats({
        quotes: quotes.length,
        orders: orders.length,
        invoices: invoices.length,
        pending_quotes: quotes.filter((q) => q.status === "pending").length,
        pending_orders: orders.filter((o) => o.status !== "delivered").length,
      });

      // Build recent activity from all sources
      const activity = [
        ...quotes.slice(0, 3).map((q) => ({
          type: "quote",
          id: q.id,
          title: `Quote #${q.quote_number || q.id.slice(0, 8)}`,
          status: q.status,
          date: q.created_at,
          amount: q.total,
        })),
        ...orders.slice(0, 3).map((o) => ({
          type: "order",
          id: o.id,
          title: `Order #${o.order_number || o.id.slice(0, 8)}`,
          status: o.status,
          date: o.created_at,
          amount: o.total,
        })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

      setRecentActivity(activity);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      processing: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-slate-100 text-slate-800";
  };

  return (
    <div className="space-y-8" data-testid="dashboard-command-center">
      {/* Hero Section */}
      <div className="bg-[#20364D] text-white rounded-[2rem] p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {userName}!</h1>
            <p className="text-slate-200 mt-2">
              Manage your orders, quotes, and requests from one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link 
              to="/account/marketplace" 
              className="flex items-center gap-2 bg-white text-[#20364D] px-5 py-3 rounded-xl font-semibold hover:bg-slate-100 transition"
              data-testid="browse-products-cta"
            >
              <Package className="w-5 h-5" />
              Browse Products
            </Link>
            <Link 
              to="/account/services" 
              className="flex items-center gap-2 bg-[#F4E7BF] text-[#8B6A10] px-5 py-3 rounded-xl font-semibold hover:bg-[#e8dbb3] transition"
              data-testid="request-service-cta"
            >
              <Palette className="w-5 h-5" />
              Request Service
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        <Link to="/dashboard/quotes" className="p-6 border rounded-2xl bg-white hover:shadow-lg transition group">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            {stats.pending_quotes > 0 && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                {stats.pending_quotes} pending
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-4">Quotes</p>
          <h2 className="text-3xl font-bold text-[#20364D] mt-1">{stats.quotes}</h2>
        </Link>

        <Link to="/account/orders" className="p-6 border rounded-2xl bg-white hover:shadow-lg transition group">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition">
              <ShoppingCart className="w-5 h-5 text-purple-600" />
            </div>
            {stats.pending_orders > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                {stats.pending_orders} active
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-4">Orders</p>
          <h2 className="text-3xl font-bold text-[#20364D] mt-1">{stats.orders}</h2>
        </Link>

        <Link to="/dashboard/invoices" className="p-6 border rounded-2xl bg-white hover:shadow-lg transition group">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition">
            <Receipt className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm text-slate-500 mt-4">Invoices</p>
          <h2 className="text-3xl font-bold text-[#20364D] mt-1">{stats.invoices}</h2>
        </Link>

        <Link to="/account/marketplace" className="p-6 border rounded-2xl bg-gradient-to-br from-[#20364D] to-[#2a4563] text-white hover:shadow-lg transition group">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm text-slate-200 mt-4">Quick Order</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-bold">Start Shopping</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="border rounded-2xl bg-white p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg text-[#20364D]">Recent Activity</h3>
            <Link to="/dashboard/quotes" className="text-sm text-[#20364D] hover:underline">
              View All
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/4 mt-2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No recent activity</p>
              <p className="text-sm text-slate-400 mt-1">Your quotes and orders will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <Link
                  key={item.id}
                  to={item.type === "quote" ? `/dashboard/quotes/${item.id}` : `/account/orders`}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      item.type === "quote" ? "bg-blue-100" : "bg-purple-100"
                    }`}>
                      {item.type === "quote" ? (
                        <FileText className="w-5 h-5 text-blue-600" />
                      ) : (
                        <ShoppingCart className="w-5 h-5 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">{item.title}</div>
                      <div className="text-xs text-slate-500">
                        {new Date(item.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                    {item.amount && (
                      <div className="text-sm font-medium text-slate-700 mt-1">
                        TZS {item.amount.toLocaleString()}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="border rounded-2xl bg-white p-6">
          <h3 className="font-bold text-lg text-[#20364D] mb-6">Quick Actions</h3>
          
          <div className="space-y-3">
            <Link to="/account/marketplace" className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition group">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-[#20364D]" />
                <span className="font-medium text-slate-700">Browse Marketplace</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#20364D] transition" />
            </Link>
            
            <Link to="/account/services" className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition group">
              <div className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-[#20364D]" />
                <span className="font-medium text-slate-700">Request a Service</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#20364D] transition" />
            </Link>
            
            <Link to="/account/assisted-quote" className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition group">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#20364D]" />
                <span className="font-medium text-slate-700">Talk to Sales</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#20364D] transition" />
            </Link>
            
            <Link to="/account/help" className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition group">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#20364D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-slate-700">Get Help</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#20364D] transition" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
