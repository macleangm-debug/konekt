import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, FileText, Receipt, Wrench, Gift, TrendingUp, ArrowRight, Clock, Building2 } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import MetricCard from "../../components/ui/MetricCard";
import BrandButton from "../../components/ui/BrandButton";
import BusinessPricingCtaBox from "../../components/public/BusinessPricingCtaBox";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function DashboardOverviewPageV2() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalQuotes: 0,
    pendingQuotes: 0,
    unpaidInvoices: 0,
    activeServiceRequests: 0,
    loyaltyPoints: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const load = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        const [ordersRes, quotesRes, invoicesRes, serviceRes, pointsRes] = await Promise.all([
          axios.get(`${API_URL}/api/customer/orders`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/api/customer/quotes`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/api/customer/invoices`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/api/customer/service-requests`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/api/customer/loyalty`, { headers }).catch(() => ({ data: { points: 0 } })),
        ]);

        const orders = ordersRes.data || [];
        const quotes = quotesRes.data || [];
        const invoices = invoicesRes.data || [];
        const serviceRequests = serviceRes.data || [];

        setStats({
          totalOrders: orders.length,
          pendingOrders: orders.filter(o => ["pending", "processing"].includes(o.status)).length,
          totalQuotes: quotes.length,
          pendingQuotes: quotes.filter(q => q.status === "pending").length,
          unpaidInvoices: invoices.filter(i => i.status !== "paid").length,
          activeServiceRequests: serviceRequests.filter(s => !["completed", "cancelled"].includes(s.status)).length,
          loyaltyPoints: pointsRes.data?.points || 0,
        });

        setRecentOrders(orders.slice(0, 5));
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const quickActions = [
    { label: "Browse Marketplace", href: "/marketplace", icon: ShoppingBag },
    { label: "Request Service", href: "/services", icon: Wrench },
    { label: "View Quotes", href: "/dashboard/quotes", icon: FileText },
    { label: "View Invoices", href: "/dashboard/invoices", icon: Receipt },
  ];

  return (
    <div data-testid="dashboard-overview">
      <PageHeader 
        title="Welcome back"
        subtitle="Here's an overview of your account activity."
      />

      {/* Metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard 
          label="Active Orders" 
          value={stats.pendingOrders} 
          icon={ShoppingBag}
          hint={`${stats.totalOrders} total orders`}
        />
        <MetricCard 
          label="Pending Quotes" 
          value={stats.pendingQuotes} 
          icon={FileText}
          hint={`${stats.totalQuotes} total quotes`}
        />
        <MetricCard 
          label="Unpaid Invoices" 
          value={stats.unpaidInvoices} 
          icon={Receipt}
        />
        <MetricCard 
          label="Loyalty Points" 
          value={stats.loyaltyPoints.toLocaleString()} 
          icon={Gift}
        />
      </div>

      {/* Quick Actions */}
      <SurfaceCard className="mb-8">
        <h2 className="text-lg font-bold text-[#20364D] mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                to={action.href}
                className="flex items-center gap-3 rounded-xl border p-4 hover:bg-slate-50 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-[#20364D]/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#20364D]" />
                </div>
                <span className="font-medium">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </SurfaceCard>

      {/* Recent Orders */}
      <SurfaceCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#20364D]">Recent Orders</h2>
          <Link to="/dashboard/orders" className="text-sm font-medium text-[#20364D] hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentOrders.length > 0 ? (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <Link
                key={order.id || order._id}
                to={`/dashboard/orders/${order.id || order._id}`}
                className="flex items-center justify-between p-4 rounded-xl border hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#20364D]/10 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-[#20364D]" />
                  </div>
                  <div>
                    <div className="font-medium">Order #{order.order_number || order.id?.slice(-6)}</div>
                    <div className="text-sm text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#20364D]">
                    TZS {Number(order.total || 0).toLocaleString()}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    order.status === "delivered" ? "bg-green-100 text-green-700" :
                    order.status === "shipped" ? "bg-blue-100 text-blue-700" :
                    order.status === "processing" ? "bg-amber-100 text-amber-700" :
                    "bg-slate-100 text-slate-700"
                  }`}>
                    {(order.status || "pending").replace(/_/g, " ")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No orders yet</p>
            <BrandButton href="/marketplace" variant="primary" className="mt-4">
              Browse Marketplace
            </BrandButton>
          </div>
        )}
      </SurfaceCard>

      {/* Business Pricing CTA */}
      <div className="mt-8">
        <BusinessPricingCtaBox
          title="Running a company account?"
          description="Recurring clients, contract customers, and bulk buyers can request better prices, contract billing, and stronger service terms."
          variant="dark"
        />
      </div>
    </div>
  );
}
