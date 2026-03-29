import React from "react";
import { FileText, ShoppingBag, Receipt, Clock, TrendingUp, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import useDashboardMetrics from "../../hooks/useDashboardMetrics";

/**
 * Customer Dashboard with real metrics from the database
 */
export default function CustomerDashboardMetricsWired({ userId }) {
  const { data, loading, error, reload } = useDashboardMetrics("customer", userId ? { user_id: userId } : {});

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
        <div className="text-red-500 mb-4">Failed to load dashboard: {error}</div>
        <button onClick={reload} className="text-[#20364D] underline">Try again</button>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="customer-dashboard-wired">
      {/* Hero Section */}
      <div className="rounded-[2.5rem] bg-gradient-to-r from-[#0E1A2B] to-[#20364D] text-white p-8 md:p-10">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="w-8 h-8" />
          <div className="text-4xl font-bold">Command Center</div>
        </div>
        <div className="text-slate-200 mt-3">Your real-time business metrics are now connected.</div>
      </div>

      {/* Metrics Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Link to="/account/quotes" className="rounded-[2rem] border bg-white p-6 hover:shadow-lg transition group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-sm text-slate-500">Quotes</div>
          </div>
          <div className="text-4xl font-bold text-[#20364D]">{data?.quotes_count || 0}</div>
        </Link>

        <Link to="/account/orders" className="rounded-[2rem] border bg-white p-6 hover:shadow-lg transition group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition">
              <ShoppingBag className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-sm text-slate-500">Orders</div>
          </div>
          <div className="text-4xl font-bold text-[#20364D]">{data?.orders_count || 0}</div>
        </Link>

        <Link to="/account/invoices" className="rounded-[2rem] border bg-white p-6 hover:shadow-lg transition group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition">
              <Receipt className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-sm text-slate-500">Invoices</div>
          </div>
          <div className="text-4xl font-bold text-[#20364D]">{data?.invoices_count || 0}</div>
        </Link>

        <div className="rounded-[2rem] border bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div className="text-sm text-slate-500">Pending Amount</div>
          </div>
          <div className="text-3xl font-bold text-[#20364D]">
            TZS {Number(data?.pending_amount || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-[2rem] border bg-white p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="text-2xl font-bold text-[#20364D]">Recent Activity</div>
          <Link to="/account/orders" className="text-sm text-[#20364D] font-semibold hover:underline">
            View All
          </Link>
        </div>
        <div className="space-y-4">
          {(data?.recent_activity || []).map((item, idx) => (
            <div key={idx} className="rounded-xl bg-slate-50 p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-[#20364D]">{item.title}</div>
                <div className="text-sm text-slate-500 mt-1">{item.time}</div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                item.status === "completed" || item.status === "delivered"
                  ? "bg-green-100 text-green-700"
                  : item.status === "in_progress" || item.status === "processing"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-amber-100 text-amber-700"
              }`}>
                {item.status}
              </span>
            </div>
          ))}
          {!data?.recent_activity?.length && (
            <div className="text-center py-8 text-slate-500">
              No recent activity. Start by browsing our marketplace!
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        <Link 
          to="/account/explore" 
          className="rounded-[2rem] border bg-white p-6 hover:shadow-lg transition text-center"
        >
          <ShoppingBag className="w-8 h-8 mx-auto text-[#20364D] mb-3" />
          <div className="font-semibold text-[#20364D]">Browse Marketplace</div>
          <div className="text-sm text-slate-500 mt-1">Find products and services</div>
        </Link>
        
        <Link 
          to="/account/service-requests" 
          className="rounded-[2rem] border bg-white p-6 hover:shadow-lg transition text-center"
        >
          <FileText className="w-8 h-8 mx-auto text-[#20364D] mb-3" />
          <div className="font-semibold text-[#20364D]">Request a Service</div>
          <div className="text-sm text-slate-500 mt-1">Get custom quotes</div>
        </Link>
        
        <Link 
          to="/account/help" 
          className="rounded-[2rem] border bg-white p-6 hover:shadow-lg transition text-center"
        >
          <Receipt className="w-8 h-8 mx-auto text-[#20364D] mb-3" />
          <div className="font-semibold text-[#20364D]">Get Help</div>
          <div className="text-sm text-slate-500 mt-1">Contact support</div>
        </Link>
      </div>
    </div>
  );
}
