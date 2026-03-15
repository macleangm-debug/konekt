import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, ShoppingCart, Users, Package, 
  DollarSign, ArrowUpRight, ArrowRight, Clock, CheckCircle,
  BarChart3, PieChart
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import axios from 'axios';
import CurrentPromotionsWidget from '../../components/admin/CurrentPromotionsWidget';
import CampaignPerformanceWidget from '../../components/admin/CampaignPerformanceWidget';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdminDashboard() {
  const { admin } = useAdminAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/analytics/overview`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `TZS ${(amount || 0).toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-24 mb-4" />
              <div className="h-8 bg-slate-200 rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const summary = analytics?.summary || {};
  const ordersByStatus = analytics?.orders_by_status || {};
  const dailyOrders = analytics?.daily_orders || [];
  const topProducts = analytics?.top_products || [];

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      {/* Welcome Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Welcome back, {admin?.full_name?.split(' ')[0]}!</h1>
          <p className="text-muted-foreground">Here's what's happening with your business today.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-full" asChild>
            <Link to="/admin/orders">View Orders</Link>
          </Button>
          <Button className="rounded-full" asChild>
            <Link to="/admin/products">Manage Products</Link>
          </Button>
        </div>
      </div>

      <CurrentPromotionsWidget />
      <CampaignPerformanceWidget />

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 border border-slate-100"
          data-testid="stat-revenue"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <span className="flex items-center gap-1 text-sm text-green-600">
              <TrendingUp className="w-4 h-4" /> 12%
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Monthly Revenue</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(summary.monthly_revenue)}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 border border-slate-100"
          data-testid="stat-orders"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm text-muted-foreground">This month</span>
          </div>
          <p className="text-sm text-muted-foreground">Total Orders</p>
          <p className="text-2xl font-bold text-primary">{summary.orders_this_month || 0}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 border border-slate-100"
          data-testid="stat-customers"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <span className="flex items-center gap-1 text-sm text-purple-600">
              +{summary.new_customers || 0} new
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Total Customers</p>
          <p className="text-2xl font-bold text-primary">{summary.total_customers || 0}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 border border-slate-100"
          data-testid="stat-products"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Active Products</p>
          <p className="text-2xl font-bold text-primary">{summary.total_products || 0}</p>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Orders Trend Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-primary">Orders Trend</h3>
              <p className="text-sm text-muted-foreground">Last 7 days</p>
            </div>
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
          </div>
          
          <div className="flex items-end gap-2 h-48">
            {dailyOrders.map((day, i) => {
              const maxOrders = Math.max(...dailyOrders.map(d => d.orders), 1);
              const height = (day.orders / maxOrders) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-slate-100 rounded-t-lg relative" style={{ height: '160px' }}>
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: 0.5 + i * 0.05 }}
                      className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-lg"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{day.day}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Orders by Status */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-6 border border-slate-100"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-primary">Order Status</h3>
              <p className="text-sm text-muted-foreground">Current distribution</p>
            </div>
            <PieChart className="w-5 h-5 text-muted-foreground" />
          </div>
          
          <div className="space-y-3">
            {[
              { key: 'pending', label: 'Pending', color: 'bg-yellow-500' },
              { key: 'design_review', label: 'In Review', color: 'bg-blue-500' },
              { key: 'printing', label: 'Production', color: 'bg-purple-500' },
              { key: 'ready', label: 'Ready', color: 'bg-green-500' },
              { key: 'delivered', label: 'Delivered', color: 'bg-slate-400' },
            ].map((status) => (
              <div key={status.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${status.color}`} />
                  <span className="text-sm">{status.label}</span>
                </div>
                <span className="font-medium">{ordersByStatus[status.key] || 0}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl p-6 border border-slate-100"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-primary">Top Products</h3>
            <Link to="/admin/products" className="text-sm text-primary flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="space-y-4">
            {topProducts.length > 0 ? topProducts.map((product, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-sm font-bold text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.quantity} units sold</p>
                  </div>
                </div>
                <span className="font-bold text-sm">{formatCurrency(product.revenue)}</span>
              </div>
            )) : (
              <p className="text-center text-muted-foreground py-8">No sales data yet</p>
            )}
          </div>
        </motion.div>

        {/* Recent Activity / Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl p-6 border border-slate-100"
        >
          <h3 className="font-bold text-primary mb-6">Quick Actions</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <Link 
              to="/admin/orders?status=pending"
              className="p-4 bg-yellow-50 rounded-xl hover:bg-yellow-100 transition-colors group"
            >
              <Clock className="w-8 h-8 text-yellow-600 mb-2" />
              <p className="font-medium">Pending Orders</p>
              <p className="text-sm text-muted-foreground">{ordersByStatus.pending || 0} orders</p>
            </Link>
            
            <Link 
              to="/admin/orders?status=printing"
              className="p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors group"
            >
              <Package className="w-8 h-8 text-purple-600 mb-2" />
              <p className="font-medium">In Production</p>
              <p className="text-sm text-muted-foreground">{ordersByStatus.printing || 0} orders</p>
            </Link>
            
            <Link 
              to="/admin/users"
              className="p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors group"
            >
              <Users className="w-8 h-8 text-blue-600 mb-2" />
              <p className="font-medium">Manage Users</p>
              <p className="text-sm text-muted-foreground">Staff & customers</p>
            </Link>
            
            <Link 
              to="/admin/products"
              className="p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors group"
            >
              <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
              <p className="font-medium">Add Product</p>
              <p className="text-sm text-muted-foreground">New inventory</p>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
