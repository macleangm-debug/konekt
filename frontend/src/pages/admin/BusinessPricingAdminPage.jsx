import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Users, CheckCircle, Clock, XCircle, TrendingUp } from "lucide-react";
import api from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import FilterBar from "../../components/ui/FilterBar";

const statusColors = {
  pending: "bg-amber-100 text-amber-700",
  contacted: "bg-blue-100 text-blue-700",
  qualified: "bg-emerald-100 text-emerald-700",
  converted: "bg-purple-100 text-purple-700",
  declined: "bg-red-100 text-red-700",
};

export default function BusinessPricingAdminPage() {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const load = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const [requestsRes, statsRes] = await Promise.all([
        api.get("/api/admin/business-pricing-requests", {
          headers,
          params: statusFilter ? { status: statusFilter } : {},
        }),
        api.get("/api/admin/business-pricing-requests/stats/summary", { headers }),
      ]);
      
      setRequests(requestsRes.data || []);
      setStats(statsRes.data);
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const updateStatus = async (requestId, newStatus, notes = "") => {
    try {
      const token = localStorage.getItem("admin_token");
      await api.put(`/api/admin/business-pricing-requests/${requestId}/status`, 
        { status: newStatus, notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      load();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const convertToLead = async (requestId) => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await api.post(`/api/admin/business-pricing-requests/${requestId}/convert-to-lead`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(res.data.message);
      load();
    } catch (err) {
      console.error("Failed to convert:", err);
    }
  };

  return (
    <div className="space-y-6" data-testid="business-pricing-admin-page">
      <PageHeader
        title="Business Pricing Requests"
        subtitle="Review and manage incoming commercial pricing requests from customers."
      />

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4" data-testid="stats-grid">
          <SurfaceCard className="text-center" data-testid="stat-total">
            <div className="text-3xl font-bold text-[#20364D]">{stats.total}</div>
            <div className="text-sm text-slate-500">Total</div>
          </SurfaceCard>
          <SurfaceCard className="text-center bg-amber-50" data-testid="stat-pending">
            <div className="text-3xl font-bold text-amber-700">{stats.pending}</div>
            <div className="text-sm text-slate-500">Pending</div>
          </SurfaceCard>
          <SurfaceCard className="text-center bg-blue-50" data-testid="stat-contacted">
            <div className="text-3xl font-bold text-blue-700">{stats.contacted}</div>
            <div className="text-sm text-slate-500">Contacted</div>
          </SurfaceCard>
          <SurfaceCard className="text-center bg-emerald-50" data-testid="stat-qualified">
            <div className="text-3xl font-bold text-emerald-700">{stats.qualified}</div>
            <div className="text-sm text-slate-500">Qualified</div>
          </SurfaceCard>
          <SurfaceCard className="text-center bg-purple-50" data-testid="stat-converted">
            <div className="text-3xl font-bold text-purple-700">{stats.converted}</div>
            <div className="text-sm text-slate-500">Converted</div>
          </SurfaceCard>
          <SurfaceCard className="text-center bg-red-50" data-testid="stat-declined">
            <div className="text-3xl font-bold text-red-700">{stats.declined}</div>
            <div className="text-sm text-slate-500">Declined</div>
          </SurfaceCard>
        </div>
      )}

      {/* Filters */}
      <SurfaceCard>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600">Filter by status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-xl px-4 py-2 focus:border-[#20364D] outline-none"
            data-testid="status-filter"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="converted">Converted</option>
            <option value="declined">Declined</option>
          </select>
        </div>
      </SurfaceCard>

      {/* Requests List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-[#20364D] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <SurfaceCard className="text-center py-12">
          <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-bold text-slate-600 mb-2">No requests found</h3>
          <p className="text-slate-500">
            {statusFilter ? "Try changing the filter." : "Business pricing requests will appear here."}
          </p>
        </SurfaceCard>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <SurfaceCard key={req.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-[#20364D]">{req.company_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[req.status] || "bg-slate-100"}`}>
                      {req.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    {req.customer_name} • {req.customer_email}
                  </div>
                  <div className="text-sm text-slate-500 mt-2">
                    Industry: {req.industry || "N/A"} • Volume: {req.estimated_monthly_volume?.replace("_", " - ") || "N/A"}
                  </div>
                  {req.product_categories?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {req.product_categories.map((cat) => (
                        <span key={cat} className="px-2 py-1 bg-slate-100 rounded-lg text-xs text-slate-600">
                          {cat.replace("_", " ")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {req.status === "pending" && (
                    <>
                      <button
                        onClick={() => updateStatus(req.id, "contacted")}
                        className="px-3 py-2 rounded-lg bg-blue-100 text-blue-700 text-sm font-semibold hover:bg-blue-200 transition"
                        data-testid={`btn-contacted-${req.id}`}
                      >
                        Mark Contacted
                      </button>
                      <button
                        onClick={() => updateStatus(req.id, "qualified")}
                        className="px-3 py-2 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-semibold hover:bg-emerald-200 transition"
                        data-testid={`btn-qualify-${req.id}`}
                      >
                        Qualify
                      </button>
                    </>
                  )}
                  {req.status === "qualified" && (
                    <button
                      onClick={() => convertToLead(req.id)}
                      className="px-3 py-2 rounded-lg bg-purple-100 text-purple-700 text-sm font-semibold hover:bg-purple-200 transition flex items-center gap-1"
                      data-testid={`btn-convert-${req.id}`}
                    >
                      <TrendingUp className="w-4 h-4" /> Convert to Lead
                    </button>
                  )}
                  {!["converted", "declined"].includes(req.status) && (
                    <button
                      onClick={() => updateStatus(req.id, "declined")}
                      className="px-3 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200 transition"
                      data-testid={`btn-decline-${req.id}`}
                    >
                      Decline
                    </button>
                  )}
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-4">
                Submitted: {new Date(req.created_at).toLocaleDateString()}
              </div>
            </SurfaceCard>
          ))}
        </div>
      )}
    </div>
  );
}
