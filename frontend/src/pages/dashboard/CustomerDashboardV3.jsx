import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { 
  Package, Palette, FileText, ShoppingCart, Receipt, 
  TrendingUp, ArrowRight, CheckCircle
} from "lucide-react";

import RecentActivityFeed from "../../components/growth/RecentActivityFeed";
import QuickNotificationsPanel from "../../components/growth/QuickNotificationsPanel";
import OrderStatusTimelineCard from "../../components/growth/OrderStatusTimelineCard";

export default function CustomerDashboardV3() {
  const [stats, setStats] = useState({
    quotes: 0, orders: 0, invoices: 0,
    pendingQuotes: 0, activeOrders: 0
  });
  const [activities, setActivities] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const name = localStorage.getItem("userName") || "there";
    setUserName(name.split(" ")[0]);
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [quotesRes, ordersRes, invoicesRes, activityRes, notifRes] = await Promise.all([
        api.get("/api/customer/quotes").catch(() => ({ data: [] })),
        api.get("/api/customer/orders").catch(() => ({ data: [] })),
        api.get("/api/customer/invoices").catch(() => ({ data: [] })),
        api.get("/api/customer/activity-feed", { params: { limit: 5 } }).catch(() => ({ data: [] })),
        api.get("/api/customer/notifications", { params: { limit: 5 } }).catch(() => ({ data: [] })),
      ]);

      const quotes = quotesRes.data || [];
      const orders = ordersRes.data || [];
      const invoices = invoicesRes.data || [];

      setStats({
        quotes: quotes.length,
        orders: orders.length,
        invoices: invoices.length,
        pendingQuotes: quotes.filter(q => q.status === "pending").length,
        activeOrders: orders.filter(o => o.status !== "delivered" && o.status !== "completed").length,
      });

      const formattedActivities = (activityRes.data || []).map(a => ({
        title: a.message,
        time: formatTime(a.created_at),
        type: a.type
      }));
      setActivities(formattedActivities);

      const formattedNotifs = (notifRes.data || []).map(n => ({
        title: n.message,
        text: n.reference || "",
        read: n.read
      }));
      setNotifications(formattedNotifs);

      const activeOrder = orders.find(o => o.status !== "delivered" && o.status !== "completed");
      if (activeOrder) {
        setCurrentOrder(activeOrder);
      }
    } catch (err) {
      console.error("Failed to load dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getOrderStageIndex = (status) => {
    const stages = { pending: 0, confirmed: 0, paid: 1, processing: 2, shipped: 3, delivered: 4 };
    return stages[status] ?? 0;
  };

  return (
    <div className="space-y-6" data-testid="customer-dashboard-v3">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-[#1f3a5f] to-[#162c47] text-white p-6 md:p-8 rounded-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Welcome back, {userName}!</h2>
            <p className="text-white/60 text-sm mt-1">
              Manage everything in one place
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link 
              to="/account/marketplace" 
              className="flex items-center gap-2 bg-white text-[#0f172a] px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-all hover:-translate-y-0.5 hover:shadow-md"
              data-testid="browse-products-btn"
            >
              <Package className="w-4 h-4" />
              Browse Products
            </Link>
            <Link 
              to="/account/marketplace?tab=services" 
              className="flex items-center gap-2 bg-[#f4c430] text-[#0f172a] px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#e8b82a] transition-all hover:-translate-y-0.5 hover:shadow-md"
              data-testid="request-service-btn"
            >
              <Palette className="w-4 h-4" />
              Request Service
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/dashboard/quotes" className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all hover:-translate-y-0.5 group" data-testid="stat-quotes">
          <div className="flex items-center justify-between">
            <FileText className="w-6 h-6 text-blue-600" />
            {stats.pendingQuotes > 0 && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                {stats.pendingQuotes} pending
              </span>
            )}
          </div>
          <p className="text-sm text-[#64748b] mt-3">Quotes</p>
          <h3 className="text-2xl font-semibold text-[#0f172a]">{stats.quotes}</h3>
        </Link>

        <Link to="/account/orders" className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all hover:-translate-y-0.5 group" data-testid="stat-orders">
          <div className="flex items-center justify-between">
            <ShoppingCart className="w-6 h-6 text-purple-600" />
            {stats.activeOrders > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                {stats.activeOrders} active
              </span>
            )}
          </div>
          <p className="text-sm text-[#64748b] mt-3">Orders</p>
          <h3 className="text-2xl font-semibold text-[#0f172a]">{stats.orders}</h3>
        </Link>

        <Link to="/dashboard/invoices" className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all hover:-translate-y-0.5 group" data-testid="stat-invoices">
          <Receipt className="w-6 h-6 text-green-600" />
          <p className="text-sm text-[#64748b] mt-3">Invoices</p>
          <h3 className="text-2xl font-semibold text-[#0f172a]">{stats.invoices}</h3>
        </Link>

        <Link to="/account/marketplace" className="bg-[#0f172a] rounded-xl p-5 text-white hover:shadow-md transition-all hover:-translate-y-0.5" data-testid="stat-quick-order">
          <TrendingUp className="w-6 h-6" />
          <p className="text-sm text-white/60 mt-3">Quick Order</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-semibold text-sm">Start Shopping</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>

      {/* Growth Components Grid */}
      <div className="grid xl:grid-cols-3 gap-4">
        <RecentActivityFeed items={activities} />
        <QuickNotificationsPanel items={notifications} />
        {currentOrder ? (
          <OrderStatusTimelineCard
            title={`Order #${currentOrder.order_number || currentOrder.id?.slice(0, 8)}`}
            currentIndex={getOrderStageIndex(currentOrder.status)}
            steps={["Received", "Payment", "In Progress", "Shipped", "Delivered"]}
          />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6 flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mb-3" />
            <div className="text-lg font-semibold text-[#0f172a]">All Caught Up!</div>
            <p className="text-sm text-[#64748b] mt-1">No active orders to track</p>
            <Link 
              to="/account/marketplace" 
              className="mt-4 text-sm text-[#1f3a5f] font-semibold hover:underline"
            >
              Browse Products
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-[#0f172a] mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to="/account/marketplace" className="flex items-center gap-3 p-3 bg-[#f8fafc] rounded-lg hover:bg-gray-100 transition-colors text-sm" data-testid="qa-marketplace">
            <Package className="w-4 h-4 text-[#1f3a5f]" />
            <span className="font-medium text-[#0f172a]">Marketplace</span>
          </Link>
          <Link to="/account/services" className="flex items-center gap-3 p-3 bg-[#f8fafc] rounded-lg hover:bg-gray-100 transition-colors text-sm" data-testid="qa-services">
            <Palette className="w-4 h-4 text-[#1f3a5f]" />
            <span className="font-medium text-[#0f172a]">Services</span>
          </Link>
          <Link to="/account/assisted-quote" className="flex items-center gap-3 p-3 bg-[#f8fafc] rounded-lg hover:bg-gray-100 transition-colors text-sm" data-testid="qa-sales">
            <FileText className="w-4 h-4 text-[#1f3a5f]" />
            <span className="font-medium text-[#0f172a]">Talk to Sales</span>
          </Link>
          <Link to="/account/help" className="flex items-center gap-3 p-3 bg-[#f8fafc] rounded-lg hover:bg-gray-100 transition-colors text-sm" data-testid="qa-help">
            <ArrowRight className="w-4 h-4 text-[#1f3a5f]" />
            <span className="font-medium text-[#0f172a]">Get Help</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
