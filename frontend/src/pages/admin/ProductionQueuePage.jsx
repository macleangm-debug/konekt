import React, { useEffect, useState } from "react";
import { Factory, Search, Clock, User, AlertTriangle } from "lucide-react";
import { adminApi } from "@/lib/adminApi";

const productionStatuses = [
  "queued",
  "assigned",
  "in_progress",
  "waiting_approval",
  "quality_check",
  "completed",
  "blocked",
];

const statusColors = {
  queued: "bg-slate-100 text-slate-700",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  waiting_approval: "bg-yellow-100 text-yellow-700",
  quality_check: "bg-indigo-100 text-indigo-700",
  completed: "bg-green-100 text-green-700",
  blocked: "bg-red-100 text-red-700",
};

const priorityColors = {
  low: "border-slate-300",
  medium: "border-blue-300",
  high: "border-orange-400",
  urgent: "border-red-500 bg-red-50",
};

export default function ProductionQueuePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [notes, setNotes] = useState({});
  const [stats, setStats] = useState(null);

  const loadQueue = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await adminApi.getProductionQueue(params);
      setItems(res.data);
    } catch (error) {
      console.error("Failed to load production queue", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await adminApi.getProductionStats();
      setStats(res.data);
    } catch (error) {
      console.error("Failed to load stats", error);
    }
  };

  useEffect(() => {
    loadQueue();
    loadStats();
  }, [filterStatus]);

  const changeStatus = async (queueId, status) => {
    try {
      await adminApi.updateProductionStatus(queueId, {
        status,
        note: notes[queueId] || null,
      });
      setNotes((prev) => ({ ...prev, [queueId]: "" }));
      loadQueue();
      loadStats();
    } catch (error) {
      console.error("Failed to update status:", error);
      alert(error.response?.data?.detail || "Failed to update status");
    }
  };

  // Group items by status for Kanban view
  const groupedItems = productionStatuses.reduce((acc, status) => {
    acc[status] = items.filter((item) => item.status === status);
    return acc;
  }, {});

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="production-queue-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Factory className="w-8 h-8 text-[#D4A843]" />
              Production Queue
            </h1>
            <p className="text-slate-600 mt-1">
              Track jobs from queue to completion
            </p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="rounded-xl bg-white border p-4">
              <p className="text-sm text-slate-500">Total Jobs</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="rounded-xl bg-slate-100 border p-4">
              <p className="text-sm text-slate-600">Queued</p>
              <p className="text-2xl font-bold text-slate-700">{stats.queued}</p>
            </div>
            <div className="rounded-xl bg-purple-50 border border-purple-200 p-4">
              <p className="text-sm text-purple-600">In Progress</p>
              <p className="text-2xl font-bold text-purple-700">{stats.in_progress}</p>
            </div>
            <div className="rounded-xl bg-green-50 border border-green-200 p-4">
              <p className="text-sm text-green-600">Completed</p>
              <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
            </div>
            <div className="rounded-xl bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-600">Blocked</p>
              <p className="text-2xl font-bold text-red-700">{stats.blocked}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
            data-testid="filter-production-status"
          >
            <option value="">All Statuses</option>
            {productionStatuses.map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
        </div>

        {/* Kanban Board */}
        <div className="grid md:grid-cols-4 xl:grid-cols-7 gap-4 overflow-x-auto pb-4">
          {productionStatuses.map((status) => (
            <div key={status} className="min-w-[250px]" data-testid={`production-column-${status}`}>
              <div className={`rounded-t-xl px-4 py-2 font-semibold text-sm ${statusColors[status]}`}>
                {status.replace("_", " ")} ({groupedItems[status]?.length || 0})
              </div>
              <div className="rounded-b-xl bg-white border border-t-0 p-2 min-h-[300px] space-y-2">
                {loading ? (
                  <p className="text-xs text-slate-400 p-2">Loading...</p>
                ) : groupedItems[status]?.length === 0 ? (
                  <p className="text-xs text-slate-400 p-2 text-center">No items</p>
                ) : (
                  groupedItems[status]?.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-xl border-2 p-3 bg-white hover:shadow-md transition ${priorityColors[item.priority] || "border-slate-200"}`}
                      data-testid={`production-card-${item.id}`}
                    >
                      <div className="font-semibold text-sm truncate">{item.order_number}</div>
                      <div className="text-xs text-slate-600 mt-1 truncate">{item.customer_name}</div>
                      <div className="text-xs text-slate-500 mt-1">{item.production_type}</div>

                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                        {item.assigned_to && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {item.assigned_to}
                          </span>
                        )}
                        {item.priority === "urgent" && (
                          <span className="flex items-center gap-1 text-red-600">
                            <AlertTriangle className="w-3 h-3" />
                            Urgent
                          </span>
                        )}
                      </div>

                      {item.due_date && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          {new Date(item.due_date).toLocaleDateString()}
                        </div>
                      )}

                      <div className="mt-3 space-y-2">
                        <input
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                          placeholder="Add note..."
                          value={notes[item.id] || ""}
                          onChange={(e) => setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        />
                        <select
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                          value={item.status}
                          onChange={(e) => changeStatus(item.id, e.target.value)}
                          data-testid={`production-status-${item.id}`}
                        >
                          {productionStatuses.map((s) => (
                            <option key={s} value={s}>{s.replace("_", " ")}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {/* List View for detailed items */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Detailed View</h2>
          <div className="grid xl:grid-cols-2 gap-4">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-lg">{item.order_number}</div>
                    <div className="text-sm text-slate-600 mt-1">
                      {item.customer_name} • {item.production_type}
                    </div>
                    <div className="text-sm text-slate-500 mt-2 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {item.assigned_to || "Unassigned"}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        item.priority === "urgent" ? "bg-red-100 text-red-700" :
                        item.priority === "high" ? "bg-orange-100 text-orange-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {item.priority}
                      </span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${statusColors[item.status]}`}>
                    {item.status?.replace("_", " ")}
                  </span>
                </div>

                {item.notes && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl text-sm text-slate-600">
                    {item.notes}
                  </div>
                )}

                {item.due_date && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="w-4 h-4" />
                    Due: {new Date(item.due_date).toLocaleString()}
                  </div>
                )}

                {/* History */}
                {item.history?.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-sm mb-2">History</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {[...item.history].reverse().map((h, idx) => (
                        <div key={idx} className="rounded-lg bg-slate-50 border p-2 text-xs">
                          <div className="font-medium">{h.status?.replace("_", " ")}</div>
                          {h.note && <div className="text-slate-600 mt-0.5">{h.note}</div>}
                          <div className="text-slate-400 mt-0.5">
                            {h.timestamp ? new Date(h.timestamp).toLocaleString() : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
