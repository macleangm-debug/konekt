import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { 
  Package, Palette, FileText, ShoppingCart, Receipt, 
  TrendingUp, Clock, ArrowRight, Bell, CheckCircle
} from "lucide-react";

// Import growth components
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

      // Format activities for the feed
      const formattedActivities = (activityRes.data || []).map(a => ({
        title: a.message,
        time: formatTime(a.created_at),
        type: a.type
      }));
      setActivities(formattedActivities);

      // Format notifications
      const formattedNotifs = (notifRes.data || []).map(n => ({
        title: n.message,
        text: n.reference || "",
        read: n.read
      }));
      setNotifications(formattedNotifs);

      // Get current order for timeline
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
    <div className="space-y-8" data-testid="customer-dashboard-v3">
      {/* Hero Header */}
      <div className="rounded-[2.5rem] bg-gradient-to-r from-[#0E1A2B] to-[#20364D] text-white p-8 md:p-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="text-4xl font-bold">Welcome back, {userName}!</div>
            <div className="text-slate-200 mt-3 max-w-2xl">
              Track activity, manage quotes, and follow your order progress in one place.
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link 
              to="/account/marketplace" 
              className="flex items-center gap-2 bg-white text-[#20364D] px-5 py-3 rounded-xl font-semibold hover:bg-slate-100 transition"
            >
              <Package className="w-5 h-5" />
              Browse Products
            </Link>
            <Link 
              to="/account/services" 
              className="flex items-center gap-2 bg-[#F4E7BF] text-[#8B6A10] px-5 py-3 rounded-xl font-semibold hover:bg-[#e8dbb3] transition"
            >
              <Palette className="w-5 h-5" />
              Request Service
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        <Link to="/dashboard/quotes" className="p-5 border rounded-2xl bg-white hover:shadow-lg transition group">
          <div className="flex items-center justify-between">
            <FileText className="w-8 h-8 text-blue-600" />
            {stats.pendingQuotes > 0 && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                {stats.pendingQuotes} pending
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-3">Quotes</p>
          <h2 className="text-3xl font-bold text-[#20364D]">{stats.quotes}</h2>
        </Link>

        <Link to="/account/orders" className="p-5 border rounded-2xl bg-white hover:shadow-lg transition group">
          <div className="flex items-center justify-between">
            <ShoppingCart className="w-8 h-8 text-purple-600" />
            {stats.activeOrders > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                {stats.activeOrders} active
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-3">Orders</p>
          <h2 className="text-3xl font-bold text-[#20364D]">{stats.orders}</h2>
        </Link>

        <Link to="/dashboard/invoices" className="p-5 border rounded-2xl bg-white hover:shadow-lg transition group">
          <Receipt className="w-8 h-8 text-green-600" />
          <p className="text-sm text-slate-500 mt-3">Invoices</p>
          <h2 className="text-3xl font-bold text-[#20364D]">{stats.invoices}</h2>
        </Link>

        <Link to="/account/marketplace" className="p-5 border rounded-2xl bg-gradient-to-br from-[#20364D] to-[#2a4563] text-white hover:shadow-lg transition">
          <TrendingUp className="w-8 h-8" />
          <p className="text-sm text-slate-200 mt-3">Quick Order</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-bold">Start Shopping</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>

      {/* Growth Components Grid */}
      <div className="grid xl:grid-cols-3 gap-6">
        <RecentActivityFeed items={activities} />
        <QuickNotificationsPanel items={notifications} />
        {currentOrder ? (
          <OrderStatusTimelineCard
            title={`Order #${currentOrder.order_number || currentOrder.id?.slice(0, 8)}`}
            currentIndex={getOrderStageIndex(currentOrder.status)}
            steps={["Received", "Payment", "In Progress", "Shipped", "Delivered"]}
          />
        ) : (
          <div className="rounded-[2rem] border bg-white p-6 flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
            <div className="text-xl font-bold text-[#20364D]">All Caught Up!</div>
            <p className="text-slate-500 mt-2">No active orders to track</p>
            <Link 
              to="/account/marketplace" 
              className="mt-4 text-[#20364D] font-semibold hover:underline"
            >
              Browse Products →
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-[2rem] border bg-white p-6">
        <h3 className="text-xl font-bold text-[#20364D] mb-4">Quick Actions</h3>
        <div className="grid md:grid-cols-4 gap-3">
          <Link to="/account/marketplace" className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition">
            <Package className="w-5 h-5 text-[#20364D]" />
            <span className="font-medium text-slate-700">Browse Marketplace</span>
          </Link>
          <Link to="/account/services" className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition">
            <Palette className="w-5 h-5 text-[#20364D]" />
            <span className="font-medium text-slate-700">Request Service</span>
          </Link>
          <Link to="/account/assisted-quote" className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition">
            <FileText className="w-5 h-5 text-[#20364D]" />
            <span className="font-medium text-slate-700">Talk to Sales</span>
          </Link>
          <Link to="/account/help" className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition">
            <Bell className="w-5 h-5 text-[#20364D]" />
            <span className="font-medium text-slate-700">Get Help</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
