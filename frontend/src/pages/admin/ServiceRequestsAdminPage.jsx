import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { ClipboardList, Filter } from "lucide-react";

export default function ServiceRequestsAdminPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: "", status: "" });

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.category) params.append("category", filter.category);
      if (filter.status) params.append("status", filter.status);
      
      const res = await api.get(`/api/admin/service-requests?${params.toString()}`);
      setItems(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const getStatusColor = (status) => {
    switch (status) {
      case "submitted": return "bg-blue-100 text-blue-700";
      case "in_progress": return "bg-amber-100 text-amber-700";
      case "awaiting_client_feedback": return "bg-purple-100 text-purple-700";
      case "revision_requested": return "bg-orange-100 text-orange-700";
      case "completed": return "bg-emerald-100 text-emerald-700";
      case "cancelled": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
        <div className="animate-pulse">
          <div className="h-10 w-48 bg-slate-200 rounded mb-4"></div>
          <div className="grid xl:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-40 bg-slate-200 rounded-3xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="admin-service-requests-page">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-[#2D3E50]">Service Requests</h1>
          <p className="mt-2 text-slate-600">
            Review and manage creative, maintenance, support, and copywriting requests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-500" />
          <select
            className="border rounded-xl px-3 py-2 text-sm"
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
          >
            <option value="">All Categories</option>
            <option value="creative">Creative</option>
            <option value="maintenance">Maintenance</option>
            <option value="support">Support</option>
            <option value="copywriting">Copywriting</option>
          </select>
          <select
            className="border rounded-xl px-3 py-2 text-sm"
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="in_progress">In Progress</option>
            <option value="awaiting_client_feedback">Awaiting Feedback</option>
            <option value="revision_requested">Revision Requested</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border bg-white p-10 text-center">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-slate-500 mt-4">No service requests found.</p>
        </div>
      ) : (
        <div className="grid xl:grid-cols-2 gap-4">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/admin/service-requests/${item.id}`}
              className="rounded-3xl border bg-white p-6 block hover:shadow-md transition-shadow"
              data-testid={`admin-request-card-${item.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-500 capitalize">{item.category}</div>
                  <div className="text-xl font-bold mt-1 text-[#2D3E50]">{item.service_title}</div>
                  <div className="text-slate-500 mt-2">{item.customer_name} • {item.customer_email}</div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(item.status)}`}>
                  {item.status?.replace(/_/g, " ")}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  {item.currency} {Number(item.total_price || 0).toLocaleString()}
                </span>
                {item.assigned_name && (
                  <span className="text-slate-500">Assigned: {item.assigned_name}</span>
                )}
              </div>

              {item.created_at && (
                <div className="mt-2 text-xs text-slate-400">
                  Submitted: {new Date(item.created_at).toLocaleDateString()}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
