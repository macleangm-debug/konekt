import React, { useEffect, useState, useCallback } from "react";
import { RefreshCw, AlertCircle, DollarSign, Package, TrendingUp, TrendingDown } from "lucide-react";
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
];

const getStatusColor = (status) => {
  const found = STATUSES.find(s => s.value === status);
  return found ? found.color : "bg-slate-100 text-slate-700";
};

const getStatusLabel = (status) => {
  const found = STATUSES.find(s => s.value === status);
  return found ? found.label : status;
};

export default function ProductionJobsAdminPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("");
  const [costEditing, setCostEditing] = useState(null);
  const [newCost, setNewCost] = useState("");
  const [costNote, setCostNote] = useState("");
  
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

  // Stats
  const stats = {
    total: items.length,
    inProduction: items.filter(j => j.status === "in_production").length,
    blocked: items.filter(j => j.status === "blocked" || j.status === "delayed").length,
    completed: items.filter(j => j.status === "completed").length,
    totalCost: items.reduce((sum, j) => sum + Number(j.production_cost || 0), 0),
  };

  const handleCostUpdate = (job) => {
    const oldCost = Number(job.production_cost || 0);
    const parsedNewCost = parseFloat(newCost);
    
    if (isNaN(parsedNewCost) || parsedNewCost < 0) {
      alert("Please enter a valid cost");
      return;
    }

    const delta = parsedNewCost - oldCost;
    const isIncrease = delta > 0;

    confirmAction({
      title: "Update Production Cost?",
      message: `This will change the cost from TZS ${oldCost.toLocaleString()} to TZS ${parsedNewCost.toLocaleString()} (${isIncrease ? "+" : ""}${delta.toLocaleString()}). Sales and admin will be notified.`,
      confirmLabel: "Update Cost",
      tone: isIncrease ? "warning" : "default",
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("admin_token");
          await api.put(`/api/production-progress/${job.id}/cost`, {
            production_cost: parsedNewCost,
            cost_note: costNote || `Cost updated from ${oldCost} to ${parsedNewCost}`,
          }, { headers: { Authorization: `Bearer ${token}` } });
          setCostEditing(null);
          setNewCost("");
          setCostNote("");
          load();
        } catch (err) {
          console.error("Failed to update cost:", err);
          alert("Failed to update cost");
        }
      },
    });
  };

  const handleStatusUpdate = (job, newStatus) => {
    confirmAction({
      title: `Update to "${getStatusLabel(newStatus)}"?`,
      message: `This will change the job status and notify relevant parties.`,
      confirmLabel: "Update Status",
      tone: newStatus === "blocked" || newStatus === "delayed" ? "danger" : "default",
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("admin_token");
          await api.put(`/api/production-progress/${job.id}/status`, {
            status: newStatus,
            progress_note: `Admin updated status to ${newStatus}`,
          }, { headers: { Authorization: `Bearer ${token}` } });
          load();
        } catch (err) {
          console.error("Failed to update status:", err);
          alert("Failed to update status");
        }
      },
    });
  };

  return (
    <div className="space-y-8" data-testid="production-jobs-admin-page">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-[#20364D]">Production Monitoring</h1>
          <p className="text-slate-600 mt-2">
            Monitor production progress, update costs, and manage delays.
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4" data-testid="stats-grid">
        <div className="rounded-2xl bg-white border p-4 text-center">
          <div className="text-3xl font-bold text-[#20364D]">{stats.total}</div>
          <div className="text-sm text-slate-500">Total Jobs</div>
        </div>
        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 text-center">
          <div className="text-3xl font-bold text-blue-700">{stats.inProduction}</div>
          <div className="text-sm text-slate-500">In Production</div>
        </div>
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-center">
          <div className="text-3xl font-bold text-red-700">{stats.blocked}</div>
          <div className="text-sm text-slate-500">Blocked/Delayed</div>
        </div>
        <div className="rounded-2xl bg-green-50 border border-green-100 p-4 text-center">
          <div className="text-3xl font-bold text-green-700">{stats.completed}</div>
          <div className="text-sm text-slate-500">Completed</div>
        </div>
        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-center">
          <div className="text-3xl font-bold text-amber-700">TZS {(stats.totalCost / 1000000).toFixed(1)}M</div>
          <div className="text-sm text-slate-500">Total Cost</div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2" data-testid="status-filters">
        <button
          onClick={() => setSelectedFilter("")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            selectedFilter === "" 
              ? "bg-[#20364D] text-white" 
              : "bg-white border text-slate-700 hover:bg-slate-50"
          }`}
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
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Jobs Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading jobs...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border">
          <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <div className="text-xl font-semibold text-slate-600">No production jobs found</div>
        </div>
      ) : (
        <div className="rounded-3xl border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Job</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Production Cost</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((job) => (
                  <tr key={job.id} className="border-b hover:bg-slate-50" data-testid={`job-row-${job.id}`}>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[#20364D]">
                        {job.job_title || job.service_name || job.order_number || "Job"}
                      </div>
                      <div className="text-sm text-slate-500">
                        {job.customer_name || "No customer"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={job.status}
                        onChange={(e) => handleStatusUpdate(job, e.target.value)}
                        className={`rounded-xl px-3 py-2 text-sm font-semibold border-0 ${getStatusColor(job.status)}`}
                        data-testid={`status-select-${job.id}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      {costEditing === job.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={newCost}
                            onChange={(e) => setNewCost(e.target.value)}
                            placeholder="New cost"
                            className="w-32 rounded-xl border px-3 py-2 text-sm"
                            data-testid={`cost-input-${job.id}`}
                          />
                          <button
                            onClick={() => handleCostUpdate(job)}
                            className="rounded-xl bg-[#20364D] text-white px-3 py-2 text-sm font-semibold"
                            data-testid={`cost-save-${job.id}`}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setCostEditing(null); setNewCost(""); }}
                            className="rounded-xl border px-3 py-2 text-sm font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setCostEditing(job.id); setNewCost(String(job.production_cost || 0)); }}
                          className="flex items-center gap-2 text-[#20364D] hover:underline"
                          data-testid={`cost-edit-${job.id}`}
                        >
                          <DollarSign className="w-4 h-4" />
                          TZS {Number(job.production_cost || 0).toLocaleString()}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {job.status !== "completed" && (
                          <button
                            onClick={() => handleStatusUpdate(job, "completed")}
                            className="rounded-xl bg-green-100 text-green-700 px-3 py-2 text-sm font-semibold hover:bg-green-200"
                            data-testid={`complete-btn-${job.id}`}
                          >
                            Complete
                          </button>
                        )}
                        {job.status !== "blocked" && job.status !== "delayed" && (
                          <button
                            onClick={() => handleStatusUpdate(job, "blocked")}
                            className="rounded-xl bg-red-100 text-red-700 px-3 py-2 text-sm font-semibold hover:bg-red-200"
                            data-testid={`block-btn-${job.id}`}
                          >
                            Block
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
