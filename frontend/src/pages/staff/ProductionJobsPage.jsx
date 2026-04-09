import React, { useEffect, useState, useCallback } from "react";
import { RefreshCw, AlertCircle, Clock, CheckCircle, Truck, Package, Wrench } from "lucide-react";
import api from "../../lib/api";
import { useConfirmModal } from "../../contexts/ConfirmModalContext";

const STATUSES = [
  { value: "new", label: "New", color: "bg-slate-100 text-slate-700" },
  { value: "in_production", label: "In Production", color: "bg-blue-100 text-blue-700" },
  { value: "awaiting_materials", label: "Awaiting Materials", color: "bg-amber-100 text-amber-700" },
  { value: "site_visit_scheduled", label: "Site Visit", color: "bg-purple-100 text-purple-700" },
  { value: "ready_for_dispatch", label: "Ready", color: "bg-emerald-100 text-emerald-700" },
  { value: "dispatched", label: "Dispatched", color: "bg-teal-100 text-teal-700" },
  { value: "completed", label: "Completed", color: "bg-green-100 text-green-700" },
  { value: "blocked", label: "Blocked", color: "bg-red-100 text-red-700" },
  { value: "delayed", label: "Delayed", color: "bg-orange-100 text-orange-700" },
  { value: "assigned_to_partner", label: "With Partner", color: "bg-indigo-100 text-indigo-700" },
  { value: "awaiting_partner_update", label: "Awaiting Partner", color: "bg-pink-100 text-pink-700" },
];

const getStatusColor = (status) => {
  const found = STATUSES.find(s => s.value === status);
  return found ? found.color : "bg-slate-100 text-slate-700";
};

const getStatusLabel = (status) => {
  const found = STATUSES.find(s => s.value === status);
  return found ? found.label : status;
};

export default function ProductionJobsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("");
  const [expandedJob, setExpandedJob] = useState(null);
  const [progressNote, setProgressNote] = useState("");
  
  const { confirmAction } = useConfirmModal();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const q = selectedFilter ? `?status=${encodeURIComponent(selectedFilter)}` : "";
      const res = await api.get(`/api/production-progress${q}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(res.data || []);
    } catch (err) {
      console.error("Failed to load production jobs:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusUpdate = (job, newStatus) => {
    confirmAction({
      title: `Update to "${getStatusLabel(newStatus)}"?`,
      message: `This will change the job status and notify relevant parties (customer, sales, admin).`,
      confirmLabel: "Update Status",
      tone: newStatus === "blocked" || newStatus === "delayed" ? "danger" : "default",
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("admin_token");
          await api.put(`/api/production-progress/${job.id}/status`, {
            status: newStatus,
            progress_note: progressNote || `Status updated to ${newStatus}`,
          }, { headers: { Authorization: `Bearer ${token}` } });
          setProgressNote("");
          load();
        } catch (err) {
          console.error("Failed to update status:", err);
          alert("Failed to update status");
        }
      },
    });
  };

  return (
    <div className="space-y-8" data-testid="production-jobs-page">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-[#20364D]">Production Jobs</h1>
          <p className="text-slate-600 mt-2">
            Update job progress, dispatch readiness, partner execution, and delays.
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-xl border bg-white px-4 py-2 font-semibold text-[#20364D] hover:bg-slate-50 transition flex items-center gap-2"
          data-testid="refresh-jobs-btn"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-2" data-testid="status-filters">
        <button
          onClick={() => setSelectedFilter("")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            selectedFilter === "" 
              ? "bg-[#20364D] text-white" 
              : "bg-white border text-slate-700 hover:bg-slate-50"
          }`}
          data-testid="filter-all"
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setSelectedFilter(s.value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              selectedFilter === s.value 
                ? "bg-[#20364D] text-white" 
                : `${s.color} hover:opacity-80`
            }`}
            data-testid={`filter-${s.value}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading jobs...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border">
          <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <div className="text-xl font-semibold text-slate-600">No production jobs found</div>
          <p className="text-slate-500 mt-2">Jobs will appear here when orders enter production.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((job) => (
            <div 
              key={job.id} 
              className="rounded-3xl border bg-white overflow-hidden"
              data-testid={`job-card-${job.id}`}
            >
              {/* Job Header */}
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="text-xl font-bold text-[#20364D]">
                        {job.job_title || job.service_name || job.order_number || "Production Job"}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(job.status)}`}>
                        {getStatusLabel(job.status)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500">
                      {job.order_number && (
                        <span className="flex items-center gap-1">
                          <Package className="w-4 h-4" /> Order: {job.order_number}
                        </span>
                      )}
                      {job.customer_name && (
                        <span>Customer: {job.customer_name}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" /> Cost: TZS {Number(job.production_cost || 0).toLocaleString()}
                      </span>
                    </div>
                    {job.progress_note && (
                      <div className="mt-2 text-sm text-slate-600 italic">
                        Note: {job.progress_note}
                      </div>
                    )}
                  </div>

                  {/* Quick Status Actions */}
                  <div className="flex flex-wrap gap-2">
                    {["in_production", "ready_for_dispatch", "dispatched", "completed"].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusUpdate(job, s)}
                        disabled={job.status === s}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                          job.status === s 
                            ? "opacity-40 cursor-not-allowed" 
                            : "text-[#20364D] hover:bg-slate-50"
                        }`}
                        data-testid={`job-${job.id}-status-${s}`}
                      >
                        {getStatusLabel(s)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedJob === job.id && (
                <div className="px-6 pb-6 border-t bg-slate-50">
                  <div className="pt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Progress Note (optional)
                      </label>
                      <input
                        type="text"
                        value={progressNote}
                        onChange={(e) => setProgressNote(e.target.value)}
                        placeholder="Add a note about this status change..."
                        className="w-full rounded-xl border px-4 py-3"
                        data-testid="progress-note-input"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {STATUSES.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => handleStatusUpdate(job, s.value)}
                          disabled={job.status === s.value}
                          className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${s.color} ${
                            job.status === s.value ? "opacity-40 cursor-not-allowed" : "hover:opacity-80"
                          }`}
                          data-testid={`job-${job.id}-all-status-${s.value}`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Toggle Expand */}
              <button
                onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                className="w-full py-3 text-sm font-semibold text-[#20364D] hover:bg-slate-50 transition border-t"
                data-testid={`expand-job-${job.id}`}
              >
                {expandedJob === job.id ? "Hide Details" : "Show All Status Options"}
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
