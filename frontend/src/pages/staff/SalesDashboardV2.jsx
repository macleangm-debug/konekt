import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { toast } from "sonner";
import { 
  AlertTriangle, Clock, CheckCircle, Users, FileText, 
  PlusCircle, UserPlus, TrendingUp, Phone, ArrowRight,
  Target, DollarSign
} from "lucide-react";

export default function SalesDashboardV2() {
  const [stats, setStats] = useState({
    needsAction: 0,
    pendingQuotes: 0,
    readyToClose: 0,
    totalLeads: 0,
    totalQuotes: 0,
    monthlyRevenue: 0
  });
  const [urgentLeads, setUrgentLeads] = useState([]);
  const [pendingQuotes, setPendingQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [leadsRes, quotesRes, statsRes] = await Promise.all([
        api.get("/api/crm/leads").catch(() => ({ data: [] })),
        api.get("/api/quotes").catch(() => ({ data: [] })),
        api.get("/api/admin/stats").catch(() => ({ data: {} }))
      ]);

      const leads = leadsRes.data || [];
      const quotes = quotesRes.data || [];

      // Calculate urgent leads (not contacted in 24h)
      const urgent = leads.filter(l => 
        l.status === "new" || 
        (l.status === "contacted" && !l.last_contact_at)
      );

      // Pending quotes needing follow-up
      const pending = quotes.filter(q => q.status === "pending" || q.status === "sent");

      // Ready to close (approved quotes)
      const readyToClose = quotes.filter(q => q.status === "approved");

      setStats({
        needsAction: urgent.length,
        pendingQuotes: pending.length,
        readyToClose: readyToClose.length,
        totalLeads: leads.length,
        totalQuotes: quotes.length,
        monthlyRevenue: statsRes.data?.monthly_revenue || 0
      });

      setUrgentLeads(urgent.slice(0, 5));
      setPendingQuotes(pending.slice(0, 5));
    } catch (err) {
      console.error("Failed to load sales dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCall = (lead) => {
    if (lead.phone) {
      window.open(`tel:${lead.phone}`, '_blank');
      toast.success(`Calling ${lead.name || lead.company}...`);
    } else {
      toast.error("No phone number available");
    }
  };

  return (
    <div className="space-y-8" data-testid="sales-dashboard-v2">
      {/* Hero Header */}
      <div className="bg-[#20364D] text-white rounded-[2rem] p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Sales Command Center</h1>
            <p className="text-slate-200 mt-2">
              Focus on what needs action and close deals faster.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              to="/staff/quotes/new" 
              className="flex items-center gap-2 bg-white text-[#20364D] px-5 py-3 rounded-xl font-semibold hover:bg-slate-100 transition"
              data-testid="create-quote-btn"
            >
              <PlusCircle className="w-5 h-5" />
              Create Quote
            </Link>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Needs Immediate Action */}
        <div className="bg-red-50 border border-red-200 p-6 rounded-2xl hover:shadow-lg transition group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            {stats.needsAction > 0 && (
              <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse">
                URGENT
              </span>
            )}
          </div>
          <p className="text-sm text-red-600 mt-4">Needs Immediate Action</p>
          <h2 className="text-3xl font-bold text-red-700 mt-1">{stats.needsAction} Leads</h2>
          <p className="text-xs text-red-500 mt-2">Not contacted yet</p>
          <Link 
            to="/admin/crm?filter=urgent"
            className="mt-4 w-full flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-red-700 transition"
            data-testid="view-urgent-leads-btn"
          >
            View Leads
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Quotes Pending */}
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-2xl hover:shadow-lg transition group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center group-hover:bg-yellow-200 transition">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-sm text-yellow-600 mt-4">Quotes Pending</p>
          <h2 className="text-3xl font-bold text-yellow-700 mt-1">{stats.pendingQuotes} Quotes</h2>
          <p className="text-xs text-yellow-500 mt-2">Awaiting customer response</p>
          <Link 
            to="/admin/quotes?filter=pending"
            className="mt-4 w-full flex items-center justify-center gap-2 bg-yellow-500 text-white px-4 py-3 rounded-xl font-semibold hover:bg-yellow-600 transition"
            data-testid="follow-up-quotes-btn"
          >
            Follow Up
            <Phone className="w-4 h-4" />
          </Link>
        </div>

        {/* Ready to Close */}
        <div className="bg-green-50 border border-green-200 p-6 rounded-2xl hover:shadow-lg transition group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            {stats.readyToClose > 0 && (
              <span className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                HOT
              </span>
            )}
          </div>
          <p className="text-sm text-green-600 mt-4">Ready to Close</p>
          <h2 className="text-3xl font-bold text-green-700 mt-1">{stats.readyToClose} Deals</h2>
          <p className="text-xs text-green-500 mt-2">Approved, awaiting payment</p>
          <Link 
            to="/admin/quotes?filter=approved"
            className="mt-4 w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-green-700 transition"
            data-testid="close-deals-btn"
          >
            Close Deals
            <DollarSign className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-slate-400" />
            <span className="text-sm text-slate-500">Total Leads</span>
          </div>
          <div className="text-2xl font-bold text-[#20364D] mt-2">{stats.totalLeads}</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-slate-400" />
            <span className="text-sm text-slate-500">Total Quotes</span>
          </div>
          <div className="text-2xl font-bold text-[#20364D] mt-2">{stats.totalQuotes}</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-slate-400" />
            <span className="text-sm text-slate-500">Conversion Rate</span>
          </div>
          <div className="text-2xl font-bold text-[#20364D] mt-2">
            {stats.totalLeads > 0 ? Math.round((stats.readyToClose / stats.totalLeads) * 100) : 0}%
          </div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-slate-400" />
            <span className="text-sm text-slate-500">Monthly Revenue</span>
          </div>
          <div className="text-2xl font-bold text-[#20364D] mt-2">
            TZS {(stats.monthlyRevenue / 1000000).toFixed(1)}M
          </div>
        </div>
      </div>

      {/* Lists */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Urgent Leads */}
        <div className="bg-white border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[#20364D]">Urgent Leads</h3>
            <Link to="/admin/crm" className="text-sm text-[#20364D] hover:underline">
              View All
            </Link>
          </div>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : urgentLeads.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p>All caught up! No urgent leads.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {urgentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div>
                    <div className="font-medium text-slate-800">{lead.name || lead.company}</div>
                    <div className="text-xs text-slate-500">{lead.email}</div>
                  </div>
                  <button 
                    onClick={() => handleQuickCall(lead)}
                    className="p-2 bg-green-100 rounded-lg hover:bg-green-200 transition"
                    title="Quick Call"
                  >
                    <Phone className="w-4 h-4 text-green-600" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Quotes */}
        <div className="bg-white border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[#20364D]">Pending Quotes</h3>
            <Link to="/admin/quotes" className="text-sm text-[#20364D] hover:underline">
              View All
            </Link>
          </div>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : pendingQuotes.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p>No pending quotes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingQuotes.map((quote) => (
                <Link 
                  key={quote.id} 
                  to={`/admin/quotes/${quote.id}`}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition"
                >
                  <div>
                    <div className="font-medium text-slate-800">
                      #{quote.quote_number || quote.id.slice(0, 8)}
                    </div>
                    <div className="text-xs text-slate-500">{quote.customer_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-slate-700">
                      TZS {(quote.total || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-yellow-600">{quote.status}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border rounded-2xl p-6">
        <h3 className="text-xl font-bold text-[#20364D] mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <Link 
            to="/staff/quotes/new"
            className="flex items-center gap-2 bg-[#20364D] text-white px-5 py-3 rounded-xl font-semibold hover:bg-[#2a4563] transition"
          >
            <PlusCircle className="w-5 h-5" />
            Create Quote
          </Link>
          <Link 
            to="/admin/crm/new"
            className="flex items-center gap-2 border border-[#20364D] text-[#20364D] px-5 py-3 rounded-xl font-semibold hover:bg-slate-50 transition"
          >
            <UserPlus className="w-5 h-5" />
            Add Lead
          </Link>
          <Link 
            to="/admin/crm"
            className="flex items-center gap-2 border border-slate-300 text-slate-600 px-5 py-3 rounded-xl font-semibold hover:bg-slate-50 transition"
          >
            <Users className="w-5 h-5" />
            CRM Pipeline
          </Link>
        </div>
      </div>
    </div>
  );
}
