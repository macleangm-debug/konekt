import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Wrench, Eye, Clock, CheckCircle, AlertCircle } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import FilterBar from "../../components/ui/FilterBar";
import BrandButton from "../../components/ui/BrandButton";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function ServiceRequestsPageV2() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    axios.get(`${API_URL}/api/customer/service-requests`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setRequests(res.data || []))
      .catch(err => console.error("Failed to load service requests:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredRequests = requests.filter(req => {
    const matchesSearch = !searchValue || 
      (req.request_number || "").toLowerCase().includes(searchValue.toLowerCase()) ||
      (req.service_type || "").toLowerCase().includes(searchValue.toLowerCase());
    const matchesStatus = !statusFilter || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const styles = {
      completed: "bg-green-100 text-green-700",
      in_progress: "bg-blue-100 text-blue-700",
      pending: "bg-amber-100 text-amber-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return styles[status] || styles.pending;
  };

  return (
    <div data-testid="service-requests-page">
      <PageHeader 
        title="Service Requests"
        subtitle="Track your service requests and their progress."
        actions={
          <BrandButton href="/services" variant="primary">
            <Wrench className="w-5 h-5 mr-2" />
            New Request
          </BrandButton>
        }
      />

      <FilterBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search requests..."
        filters={[
          {
            name: "status",
            value: statusFilter,
            onChange: setStatusFilter,
            placeholder: "All Statuses",
            options: [
              { value: "pending", label: "Pending" },
              { value: "in_progress", label: "In Progress" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
            ],
          },
        ]}
        className="mb-6"
      />

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredRequests.length > 0 ? (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <SurfaceCard key={request.id || request._id} className="hover:shadow-md transition">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#20364D]/10 flex items-center justify-center">
                    <Wrench className="w-6 h-6 text-[#20364D]" />
                  </div>
                  <div>
                    <div className="font-bold text-[#20364D]">
                      {request.service_type || "Service Request"}
                    </div>
                    <div className="text-sm text-slate-500">
                      #{request.request_number || request.id?.slice(-8)}
                    </div>
                    <div className="text-sm text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(request.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusBadge(request.status)}`}>
                    {(request.status || "pending").replace(/_/g, " ").toUpperCase()}
                  </span>
                  <Link
                    to={`/dashboard/service-requests/${request.id || request._id}`}
                    className="p-3 rounded-xl border hover:bg-slate-50 transition"
                  >
                    <Eye className="w-5 h-5 text-slate-500" />
                  </Link>
                </div>
              </div>
            </SurfaceCard>
          ))}
        </div>
      ) : (
        <SurfaceCard className="text-center py-12">
          <Wrench className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-bold text-slate-600 mb-2">No service requests</h3>
          <p className="text-slate-500 mb-6">
            Request a service to get started.
          </p>
          <BrandButton href="/services" variant="primary">
            Request Service
          </BrandButton>
        </SurfaceCard>
      )}
    </div>
  );
}
