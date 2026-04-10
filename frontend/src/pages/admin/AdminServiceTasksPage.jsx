import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Clock, CheckCircle, AlertTriangle, ArrowRight, Search, Filter } from "lucide-react";
import api from "../../lib/api";
import DetailDrawer from "../../components/admin/shared/DetailDrawer";

const STATUS_CONFIG = {
  unassigned: { label: "Unassigned", color: "bg-slate-100 text-slate-600" },
  assigned: { label: "Assigned", color: "bg-blue-100 text-blue-700" },
  awaiting_cost: { label: "Awaiting Cost", color: "bg-amber-100 text-amber-700" },
  cost_submitted: { label: "Cost Submitted", color: "bg-cyan-100 text-cyan-700" },
  in_progress: { label: "In Progress", color: "bg-indigo-100 text-indigo-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  delayed: { label: "Delayed", color: "bg-red-100 text-red-700" },
  failed: { label: "Failed", color: "bg-red-200 text-red-800" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unassigned;
  return <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>;
}

export default function AdminServiceTasksPage() {
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const initFilter = searchParams.get("filter") || "all";
  const [statusFilter, setStatusFilter] = useState(
    ["overdue", "unassigned", "awaiting", "cost_submitted", "in_progress", "completed"].includes(initFilter) ? initFilter : "all"
  );
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const taskId = searchParams.get("task");
    if (taskId && tasks.length > 0) {
      const found = tasks.find(t => t.id === taskId);
      if (found) { setSelected(found); setDrawerOpen(true); }
    }
  }, [searchParams, tasks]);

  const loadData = async () => {
    try {
      const [tasksRes, statsRes] = await Promise.all([
        api.get("/api/admin/service-tasks"),
        api.get("/api/admin/service-tasks/stats/summary"),
      ]);
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
      setStats(statsRes.data || {});
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const isOverdue = (task) => {
    if (!["assigned", "awaiting_cost"].includes(task.status) || task.partner_cost) return false;
    const created = new Date(task.created_at);
    return (Date.now() - created.getTime()) > 48 * 60 * 60 * 1000;
  };

  const filtered = useMemo(() => {
    let list = tasks;
    if (statusFilter === "overdue") {
      list = list.filter(isOverdue);
    } else if (statusFilter === "unassigned") {
      list = list.filter(t => t.status === "unassigned");
    } else if (statusFilter === "awaiting") {
      list = list.filter(t => ["assigned", "awaiting_cost"].includes(t.status));
    } else if (statusFilter !== "all") {
      list = list.filter(t => t.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        (t.service_type || "").toLowerCase().includes(q) ||
        (t.partner_name || "").toLowerCase().includes(q) ||
        (t.client_name || "").toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        (t.scope || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [tasks, statusFilter, search]);

  const tabs = [
    { key: "all", label: "All", count: stats.total || 0 },
    { key: "unassigned", label: "Unassigned", count: stats.unassigned || 0 },
    { key: "awaiting", label: "Awaiting", count: (stats.assigned || 0) + (stats.awaiting_cost || 0) },
    { key: "cost_submitted", label: "To Review", count: stats.cost_submitted || 0 },
    { key: "in_progress", label: "In Progress", count: stats.in_progress || 0 },
    { key: "completed", label: "Completed", count: stats.completed || 0 },
    { key: "overdue", label: "Overdue", count: tasks.filter(isOverdue).length },
  ];

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading tasks...</div>;

  return (
    <div className="space-y-6" data-testid="admin-service-tasks-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">Service Tasks</h1>
          <p className="text-sm text-slate-500 mt-1">Manage partner assignments, cost submissions, and execution status</p>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              statusFilter === tab.key
                ? tab.key === "overdue"
                  ? "bg-red-600 text-white"
                  : tab.key === "unassigned"
                    ? "bg-amber-600 text-white"
                    : "bg-[#20364D] text-white"
                : tab.key === "unassigned" && tab.count > 0
                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            data-testid={`filter-${tab.key}`}
          >
            {tab.label} <span className="ml-1 opacity-75">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
          data-testid="search-tasks"
        />
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-left">Task</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-left">Service</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-left">Partner</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-left">Client</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-left">Cost</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-left">Status</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-left">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">No tasks found</td></tr>
            ) : filtered.map(task => {
              const overdue = isOverdue(task);
              return (
                <tr
                  key={task.id}
                  onClick={() => { setSelected(task); setDrawerOpen(true); }}
                  className={`cursor-pointer transition hover:bg-slate-50 ${overdue ? "bg-red-50/50" : ""}`}
                  data-testid={`task-row-${task.id}`}
                >
                  <td className="px-5 py-3.5 text-sm font-semibold text-[#20364D]">
                    ST-{task.id?.slice(-6).toUpperCase()}
                    {overdue && <span className="ml-2 text-xs text-red-600 font-bold">OVERDUE</span>}
                  </td>
                  <td className="px-5 py-3.5 text-sm capitalize">{task.service_type}</td>
                  <td className="px-5 py-3.5 text-sm">{task.partner_name || "—"}</td>
                  <td className="px-5 py-3.5 text-sm">{task.client_name || "—"}</td>
                  <td className="px-5 py-3.5 text-sm font-medium">
                    {task.partner_cost ? `TZS ${Number(task.partner_cost).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={task.status} /></td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">
                    {task.created_at ? new Date(task.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      <DetailDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelected(null); }}
        title={selected ? `Task ST-${selected.id?.slice(-6).toUpperCase()}` : "Task Details"}
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">Status:</span> <StatusBadge status={selected.status} /></div>
              <div><span className="text-slate-500">Service:</span> <span className="font-medium capitalize">{selected.service_type}</span></div>
              <div><span className="text-slate-500">Partner:</span> <span className="font-medium">{selected.partner_name || "Unassigned"}</span></div>
              <div><span className="text-slate-500">Client:</span> <span className="font-medium">{selected.client_name || "—"}</span></div>
              <div><span className="text-slate-500">Quantity:</span> <span className="font-medium">{selected.quantity || 1}</span></div>
              <div><span className="text-slate-500">Deadline:</span> <span className="font-medium">{selected.deadline ? new Date(selected.deadline).toLocaleDateString("en-GB") : "—"}</span></div>
            </div>

            {selected.description && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Description</h4>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{selected.description}</p>
              </div>
            )}

            {selected.scope && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Scope</h4>
                <p className="text-sm text-slate-700">{selected.scope}</p>
              </div>
            )}

            {/* Cost Section */}
            <div className="border-t pt-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Cost & Pricing</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Partner Cost:</span> <span className="font-semibold">{selected.partner_cost ? `TZS ${Number(selected.partner_cost).toLocaleString()}` : "Pending"}</span></div>
                <div><span className="text-slate-500">Selling Price:</span> <span className="font-semibold">{selected.selling_price ? `TZS ${Number(selected.selling_price).toLocaleString()}` : "—"}</span></div>
                {selected.margin_pct != null && (
                  <div><span className="text-slate-500">Margin:</span> <span className="font-semibold">{selected.margin_pct}%</span></div>
                )}
              </div>
              {selected.cost_notes && <p className="text-xs text-slate-500 mt-2">Notes: {selected.cost_notes}</p>}
            </div>

            {/* Delivery Details */}
            {(selected.delivery_address || selected.contact_person) && (
              <div className="border-t pt-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Delivery Details</h4>
                {selected.delivery_address && <p className="text-sm">{selected.delivery_address}</p>}
                {selected.contact_person && <p className="text-sm mt-1">{selected.contact_person} {selected.contact_phone ? `(${selected.contact_phone})` : ""}</p>}
              </div>
            )}

            {/* Auto-assignment Info */}
            {selected.auto_assigned === false && selected.assignment_failure_reason && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-800">Auto-assignment Failed</span>
                </div>
                <p className="text-xs text-amber-700">{selected.assignment_failure_reason}</p>
              </div>
            )}
            {selected.auto_assigned === true && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-800">Auto-assigned</span>
                  {selected.assignment_match_source && <span className="text-xs text-green-600 ml-1">(via {selected.assignment_match_source})</span>}
                </div>
              </div>
            )}

            {/* Timeline */}
            {selected.timeline && selected.timeline.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Timeline</h4>
                <div className="space-y-2">
                  {selected.timeline.map((entry, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                      <div>
                        <span className="font-medium">{entry.action}</span>
                        <span className="text-slate-400 ml-2">{entry.at ? new Date(entry.at).toLocaleString("en-GB") : ""}</span>
                        {entry.note && <p className="text-slate-500 mt-0.5">{entry.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
