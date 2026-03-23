import React from "react";
import { 
  DollarSign, ShoppingBag, Clock, CheckCircle, Users, UserCheck, 
  TrendingUp, FileText, Loader2, AlertCircle 
} from "lucide-react";
import { Link } from "react-router-dom";
import useDashboardMetrics from "../../hooks/useDashboardMetrics";

/**
 * Admin Dashboard with real metrics from the database
 */
export default function AdminDashboardMetricsWired() {
  const { data, loading, error, reload } = useDashboardMetrics("admin");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[2rem] border bg-white p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
        <div className="text-red-500 mb-4">Failed to load dashboard: {error}</div>
        <button onClick={reload} className="text-[#20364D] underline">Try again</button>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="admin-dashboard-wired">
      {/* Hero Section */}
      <div className="rounded-[2.5rem] bg-gradient-to-r from-[#0E1A2B] to-[#20364D] text-white p-8 md:p-10">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="w-8 h-8" />
          <div className="text-4xl font-bold">Admin Control Center</div>
        </div>
        <div className="text-slate-200 mt-3">Live metrics from your platform database.</div>
      </div>

      {/* Revenue Section */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-[2rem] border bg-white p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center">
              <DollarSign className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Total Revenue (Paid)</div>
              <div className="text-3xl font-bold text-[#20364D]">
                TZS {Number(data?.revenue || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border bg-white p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-7 h-7 text-amber-600" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Pending Revenue</div>
              <div className="text-3xl font-bold text-[#20364D]">
                TZS {Number(data?.pending_revenue || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Pipeline */}
      <div className="rounded-[2rem] border bg-white p-8">
        <div className="text-xl font-bold text-[#20364D] mb-6">Orders Pipeline</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <div className="text-3xl font-bold text-[#20364D]">{data?.orders_pending || 0}</div>
            <div className="text-sm text-slate-500">Pending</div>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-[#20364D]">{data?.orders_in_progress || 0}</div>
            <div className="text-sm text-slate-500">In Progress</div>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-[#20364D]">{data?.orders_completed || 0}</div>
            <div className="text-sm text-slate-500">Completed</div>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-8 h-8 text-slate-600" />
            </div>
            <div className="text-3xl font-bold text-[#20364D]">{data?.orders_total || 0}</div>
            <div className="text-sm text-slate-500">Total</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 xl:grid-cols-5 gap-6">
        <div className="rounded-[2rem] border bg-white p-6">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-6 h-6 text-purple-600" />
            <div className="text-sm text-slate-500">Partners</div>
          </div>
          <div className="text-2xl font-bold text-[#20364D]">
            {data?.active_partners || 0} <span className="text-sm font-normal text-slate-400">/ {data?.total_partners || 0}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">active / total</div>
        </div>

        <div className="rounded-[2rem] border bg-white p-6">
          <div className="flex items-center gap-3 mb-3">
            <UserCheck className="w-6 h-6 text-indigo-600" />
            <div className="text-sm text-slate-500">Affiliates</div>
          </div>
          <div className="text-2xl font-bold text-[#20364D]">
            {data?.active_affiliates || 0} <span className="text-sm font-normal text-slate-400">/ {data?.total_affiliates || 0}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">active / total</div>
        </div>

        <div className="rounded-[2rem] border bg-white p-6">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div className="text-sm text-slate-500">Quotes</div>
          </div>
          <div className="text-2xl font-bold text-[#20364D]">
            {data?.quotes_pending || 0} <span className="text-sm font-normal text-slate-400">/ {data?.quotes_total || 0}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">pending / total</div>
        </div>

        <div className="rounded-[2rem] border bg-white p-6">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-6 h-6 text-teal-600" />
            <div className="text-sm text-slate-500">Customers</div>
          </div>
          <div className="text-2xl font-bold text-[#20364D]">{data?.customers_total || 0}</div>
          <div className="text-xs text-slate-400 mt-1">registered</div>
        </div>

        <Link to="/admin/orders" className="rounded-[2rem] border bg-[#20364D] p-6 text-white hover:bg-[#2a4a66] transition">
          <div className="text-sm opacity-80 mb-2">Quick Action</div>
          <div className="text-lg font-bold">View All Orders</div>
        </Link>
      </div>
    </div>
  );
}
