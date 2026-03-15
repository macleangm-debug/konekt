import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Wrench, Clock, CheckCircle2, AlertCircle, Plus, Calendar } from "lucide-react";
import api from "../../lib/api";
import EmptyStateCard from "../../components/customer/EmptyStateCard";
import PromoArtCards from "../../components/customer/PromoArtCards";
import { Button } from "../../components/ui/button";

export default function MaintenanceDashboardPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      try {
        // Get service requests and filter for maintenance category
        const res = await api.get("/api/service-requests/my");
        const maintenanceRequests = (res.data || []).filter(
          r => r.category === "maintenance" || r.category === "support"
        );
        setRequests(maintenanceRequests);
      } catch (error) {
        console.error("Failed to load maintenance requests:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
      case "submitted":
        return "bg-amber-100 text-amber-700";
      case "scheduled":
        return "bg-blue-100 text-blue-700";
      case "in_progress":
        return "bg-purple-100 text-purple-700";
      case "completed":
        return "bg-emerald-100 text-emerald-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
      case "submitted":
        return <Clock className="w-4 h-4" />;
      case "scheduled":
        return <Calendar className="w-4 h-4" />;
      case "completed":
        return <CheckCircle2 className="w-4 h-4" />;
      case "cancelled":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Wrench className="w-4 h-4" />;
    }
  };

  const filteredRequests = requests.filter(r => {
    if (filter === "all") return true;
    if (filter === "active") return !["completed", "cancelled"].includes(r.status);
    return r.status === filter;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 w-64 bg-slate-200 rounded"></div>
        </div>
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="rounded-2xl bg-slate-200 h-24 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="maintenance-dashboard">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Equipment Maintenance</h1>
          <p className="mt-1 text-slate-600">Track your maintenance requests and service history.</p>
        </div>
        <Link to="/services/equipment-repair-request/request">
          <Button className="bg-[#D4A843] hover:bg-[#c49a3d]" data-testid="new-request-btn">
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "All" },
          { key: "active", label: "Active" },
          { key: "scheduled", label: "Scheduled" },
          { key: "completed", label: "Completed" },
        ].map(f => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.key)}
            className={filter === f.key ? "bg-[#2D3E50]" : ""}
            data-testid={`filter-${f.key}`}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Requests List */}
      {filteredRequests.length > 0 ? (
        <div className="space-y-4">
          {filteredRequests.map(request => (
            <div
              key={request.id}
              className="rounded-2xl border bg-white p-5 hover:shadow-md transition"
              data-testid={`request-card-${request.id}`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-6 h-6 text-[#2D3E50]" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">
                      {request.service_title || request.equipment_type || request.service_type || "Maintenance Request"}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {request.created_at
                        ? new Date(request.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </p>
                    {request.scheduled_date && (
                      <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Scheduled: {new Date(request.scheduled_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                    {getStatusIcon(request.status)}
                    <span className="capitalize">{request.status?.replace(/_/g, " ")}</span>
                  </span>
                </div>
              </div>

              {request.description && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-slate-600 line-clamp-2">{request.description}</p>
                </div>
              )}

              {request.technician_notes && (
                <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-xs font-medium text-blue-700">Technician Notes:</p>
                  <p className="text-sm text-blue-800 mt-1">{request.technician_notes}</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t flex justify-end">
                <Link
                  to={`/dashboard/service-requests/${request.id}`}
                  className="text-sm font-medium text-[#2D3E50] hover:underline"
                  data-testid={`view-details-${request.id}`}
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyStateCard
          icon={Wrench}
          title="No maintenance requests yet"
          text="Need support for printers, photocopiers, scanners, or office equipment? Submit a request and manage it fully online."
          ctaLabel="Book maintenance service"
          ctaHref="/services/equipment-repair-request/request"
          secondaryCtaLabel="Browse support services"
          secondaryCtaHref="/services"
          testId="empty-maintenance"
        />
      )}

      {/* Promo Cards */}
      <PromoArtCards />
    </div>
  );
}
