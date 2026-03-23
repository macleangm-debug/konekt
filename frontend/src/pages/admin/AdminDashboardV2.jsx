import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { 
  DollarSign, ShoppingCart, Users, UserCheck, AlertTriangle,
  TrendingUp, Clock, CheckCircle, Package, ArrowRight,
  Settings, Activity, Truck
} from "lucide-react";

export default function AdminDashboardV2() {
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    activePartners: 0,
    affiliates: 0,
    pendingOrders: 0,
    inProgressOrders: 0,
    completedOrders: 0,
    delayedOrders: 0,
    overloadedPartners: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [ordersRes, partnersRes, affiliatesRes, statsRes, alertsRes] = await Promise.all([
        api.get("/api/orders").catch(() => ({ data: [] })),
        api.get("/api/admin/partners").catch(() => ({ data: [] })),
        api.get("/api/admin/affiliates").catch(() => ({ data: [] })),
        api.get("/api/admin/stats").catch(() => ({ data: {} })),
        api.get("/api/admin/alerts").catch(() => ({ data: [] }))
      ]);

      const orders = ordersRes.data || [];
      const partners = partnersRes.data || [];
      const affiliates = affiliatesRes.data || [];

      // Calculate order pipeline
      const pending = orders.filter(o => o.status === "pending" || o.status === "confirmed");
      const inProgress = orders.filter(o => o.status === "processing" || o.status === "in_production");
      const completed = orders.filter(o => o.status === "delivered" || o.status === "completed");

      // Calculate total revenue
      const totalRevenue = orders
        .filter(o => o.status === "delivered" || o.status === "completed" || o.status === "paid")
        .reduce((sum, o) => sum + (o.total || 0), 0);

      // Active partners
      const activePartners = partners.filter(p => p.status === "active");

      // Get alerts/issues
      const systemAlerts = alertsRes.data || [];
      const delayedOrders = orders.filter(o => {
        if (!o.estimated_delivery) return false;
        const dueDate = new Date(o.estimated_delivery);
        return dueDate < new Date() && o.status !== "delivered";
      });

      setStats({
        revenue: totalRevenue,
        orders: orders.length,
        activePartners: activePartners.length,
        affiliates: affiliates.length,
        pendingOrders: pending.length,
        inProgressOrders: inProgress.length,
        completedOrders: completed.length,
        delayedOrders: delayedOrders.length,
        overloadedPartners: systemAlerts.filter(a => a.type === "partner_overload").length
      });

      setRecentOrders(orders.slice(0, 5));
      setAlerts(systemAlerts.slice(0, 5));
    } catch (err) {
      console.error("Failed to load admin dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount >= 1000000) {
      return `TZS ${(amount / 1000000).toFixed(1)}M`;
    }
    return `TZS ${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-8" data-testid="admin-dashboard-v2">
      {/* Hero Header */}
      <div className="bg-[#20364D] text-white rounded-[2rem] p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Admin Control Center</h1>
            <p className="text-slate-200 mt-2">
              Monitor revenue, operations, and system performance.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              to="/admin/settings-hub" 
              className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-xl hover:bg-white/20 transition"
            >
              <Settings className="w-5 h-5" />
              Settings
            </Link>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white border rounded-2xl p-6 hover:shadow-lg transition group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-sm text-slate-500 mt-4">Total Revenue</p>
          <h2 className="text-2xl font-bold text-[#20364D] mt-1">{formatCurrency(stats.revenue)}</h2>
        </div>

        <Link to="/admin/orders" className="bg-white border rounded-2xl p-6 hover:shadow-lg transition group">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-sm text-slate-500 mt-4">Total Orders</p>
          <h2 className="text-2xl font-bold text-[#20364D] mt-1">{stats.orders}</h2>
        </Link>

        <Link to="/admin/partner-ecosystem" className="bg-white border rounded-2xl p-6 hover:shadow-lg transition group">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition">
            <UserCheck className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-sm text-slate-500 mt-4">Active Partners</p>
          <h2 className="text-2xl font-bold text-[#20364D] mt-1">{stats.activePartners}</h2>
        </Link>

        <Link to="/admin/affiliate-performance" className="bg-white border rounded-2xl p-6 hover:shadow-lg transition group">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition">
            <Users className="w-6 h-6 text-amber-600" />
          </div>
          <p className="text-sm text-slate-500 mt-4">Affiliates</p>
          <h2 className="text-2xl font-bold text-[#20364D] mt-1">{stats.affiliates}</h2>
        </Link>
      </div>

      {/* Operations Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Orders Pipeline */}
        <div className="bg-white border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-[#20364D]">Orders Pipeline</h3>
            <Link to="/admin/orders" className="text-sm text-[#20364D] hover:underline">
              View All
            </Link>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-slate-700">Pending</span>
              </div>
              <span className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-slate-700">In Progress</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">{stats.inProgressOrders}</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-slate-700">Completed</span>
              </div>
              <span className="text-2xl font-bold text-green-600">{stats.completedOrders}</span>
            </div>
          </div>
        </div>

        {/* System Alerts */}
        <div className="bg-white border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-[#20364D]">System Alerts</h3>
            {(stats.delayedOrders > 0 || stats.overloadedPartners > 0) && (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                {stats.delayedOrders + stats.overloadedPartners} issues
              </span>
            )}
          </div>
          
          {stats.delayedOrders === 0 && stats.overloadedPartners === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-slate-600">All systems running smoothly</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.delayedOrders > 0 && (
                <Link 
                  to="/admin/orders?filter=delayed"
                  className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <div>
                      <span className="font-medium text-red-700">{stats.delayedOrders} delayed orders</span>
                      <p className="text-xs text-red-500">Past estimated delivery</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-red-400" />
                </Link>
              )}
              
              {stats.overloadedPartners > 0 && (
                <Link 
                  to="/admin/partner-ecosystem"
                  className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-orange-600" />
                    <div>
                      <span className="font-medium text-orange-700">{stats.overloadedPartners} partners overloaded</span>
                      <p className="text-xs text-orange-500">Consider reassigning jobs</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-orange-400" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-[#20364D]">Recent Orders</h3>
          <Link to="/admin/orders" className="text-sm text-[#20364D] hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading...</div>
        ) : recentOrders.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Package className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p>No orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Order #</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Customer</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-slate-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-2">
                      <Link to={`/admin/orders/${order.id}`} className="font-medium text-[#20364D] hover:underline">
                        #{order.order_number || order.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="py-3 px-2 text-slate-600">{order.customer_name || "N/A"}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        order.status === "delivered" ? "bg-green-100 text-green-700" :
                        order.status === "processing" ? "bg-blue-100 text-blue-700" :
                        order.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-slate-700">
                      TZS {(order.total || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-4 gap-4">
        <Link to="/admin/orders" className="flex items-center gap-3 p-4 bg-white border rounded-xl hover:shadow-md transition">
          <ShoppingCart className="w-5 h-5 text-[#20364D]" />
          <span className="font-medium text-slate-700">Manage Orders</span>
        </Link>
        <Link to="/admin/partner-ecosystem" className="flex items-center gap-3 p-4 bg-white border rounded-xl hover:shadow-md transition">
          <UserCheck className="w-5 h-5 text-[#20364D]" />
          <span className="font-medium text-slate-700">Partners</span>
        </Link>
        <Link to="/admin/deliveries" className="flex items-center gap-3 p-4 bg-white border rounded-xl hover:shadow-md transition">
          <Truck className="w-5 h-5 text-[#20364D]" />
          <span className="font-medium text-slate-700">Deliveries</span>
        </Link>
        <Link to="/admin/catalog-setup" className="flex items-center gap-3 p-4 bg-white border rounded-xl hover:shadow-md transition">
          <Package className="w-5 h-5 text-[#20364D]" />
          <span className="font-medium text-slate-700">Catalog</span>
        </Link>
      </div>
    </div>
  );
}
