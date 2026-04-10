import React, { useState, useEffect, useCallback } from "react";
import { ClipboardList, Clock, CheckCircle, AlertTriangle, Loader2, ChevronRight, Upload, Send, X, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useConfirmModal } from "../../contexts/ConfirmModalContext";

const API_URL = process.env.REACT_APP_BACKEND_URL;

function getToken() {
  return localStorage.getItem("partner_token");
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

const STATUS_CONFIG = {
  assigned:       { label: "Assigned",       color: "bg-blue-100 text-blue-700" },
  accepted:       { label: "Accepted",       color: "bg-indigo-100 text-indigo-700" },
  awaiting_cost:  { label: "Awaiting Cost",  color: "bg-amber-100 text-amber-700" },
  cost_submitted: { label: "Cost Submitted", color: "bg-cyan-100 text-cyan-700" },
  in_progress:    { label: "In Progress",    color: "bg-blue-100 text-blue-700" },
  in_transit:     { label: "In Transit",     color: "bg-purple-100 text-purple-700" },
  delivered:      { label: "Delivered",       color: "bg-green-100 text-green-700" },
  completed:      { label: "Completed",      color: "bg-green-100 text-green-700" },
  delayed:        { label: "Delayed",        color: "bg-red-100 text-red-700" },
  failed:         { label: "Failed / Issue",  color: "bg-red-100 text-red-700" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "bg-slate-100 text-slate-600" };
  return <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${cfg.color}`} data-testid={`status-badge-${status}`}>{cfg.label}</span>;
}

// ────────── KPI Card ──────────
function KpiCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border bg-white p-4 flex items-center gap-3" data-testid={`kpi-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-[#20364D]">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

// ────────── Task Detail Drawer ──────────
function TaskDetailDrawer({ task, onClose, onRefresh }) {
  const [costInput, setCostInput] = useState(task.partner_cost || "");
  const [costNotes, setCostNotes] = useState(task.cost_notes || "");
  const [noteInput, setNoteInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { confirmAction } = useConfirmModal();

  const submitCost = async () => {
    if (!costInput || Number(costInput) <= 0) { toast.error("Enter a valid cost"); return; }
    setSubmitting(true);
    try {
      await apiFetch(`/api/partner-portal/assigned-work/${task.id}/submit-cost`, {
        method: "PUT",
        body: JSON.stringify({ cost: Number(costInput), notes: costNotes }),
      });
      toast.success("Cost submitted");
      onRefresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = (newStatus) => {
    confirmAction({
      title: `Update Status to "${STATUS_CONFIG[newStatus]?.label || newStatus}"?`,
      message: "This will update the task status and notify the team.",
      confirmLabel: "Update Status",
      tone: newStatus === "delayed" || newStatus === "failed" ? "danger" : "default",
      onConfirm: async () => {
        try {
          await apiFetch(`/api/partner-portal/assigned-work/${task.id}/update-status`, {
            method: "PUT",
            body: JSON.stringify({ status: newStatus }),
          });
          toast.success(`Status updated to ${newStatus}`);
          onRefresh();
        } catch (err) {
          toast.error(err.message);
        }
      },
    });
  };

  const addNote = async () => {
    if (!noteInput.trim()) return;
    try {
      await apiFetch(`/api/partner-portal/assigned-work/${task.id}/add-note`, {
        method: "POST",
        body: JSON.stringify({ note: noteInput.trim() }),
      });
      toast.success("Note added");
      setNoteInput("");
      onRefresh();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const statusActions = [];
  const s = task.status;
  if (s === "assigned") statusActions.push({ status: "accepted", label: "Accept Task" });
  if (s === "accepted" || s === "assigned") statusActions.push({ status: "in_progress", label: "Start Work" });
  if (s === "in_progress") {
    statusActions.push({ status: "completed", label: "Mark Completed" });
    statusActions.push({ status: "in_transit", label: "In Transit" });
  }
  if (s === "in_transit") statusActions.push({ status: "delivered", label: "Mark Delivered" });
  if (s !== "completed" && s !== "delivered" && s !== "failed") {
    statusActions.push({ status: "delayed", label: "Report Delay" });
    statusActions.push({ status: "failed", label: "Report Issue" });
  }

  return (
    <div className="fixed inset-0 z-50 flex" data-testid="task-detail-drawer">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="ml-auto w-full max-w-lg bg-white shadow-2xl overflow-y-auto relative flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-[#20364D]">{task.task_ref}</h2>
            <p className="text-xs text-slate-500 capitalize">{task.service_type}{task.service_subtype ? ` — ${task.service_subtype}` : ""}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 p-6 space-y-6">
          {/* Task Summary */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Task Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">Status:</span> <StatusBadge status={task.status} /></div>
              <div><span className="text-slate-500">Quantity:</span> <span className="font-medium">{task.quantity}</span></div>
              {task.is_logistics && task.client_name && (
                <div><span className="text-slate-500">Client:</span> <span className="font-medium">{task.client_name}</span></div>
              )}
              <div><span className="text-slate-500">Deadline:</span> <span className="font-medium">{task.deadline ? new Date(task.deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span></div>
            </div>
            {task.description && <p className="text-sm text-slate-600 mt-3 bg-slate-50 rounded-xl p-3">{task.description}</p>}
            {task.scope && <p className="text-xs text-slate-500 mt-1">Scope: {task.scope}</p>}
          </section>

          {/* Delivery Details — only shown to logistics/delivery partners */}
          {task.is_logistics && (task.delivery_address || task.contact_person) && (
            <section>
              <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Delivery Details</h3>
              {task.delivery_address && (
                <p className="text-sm text-slate-600"><span className="text-slate-500">Address:</span> {task.delivery_address}</p>
              )}
              {task.contact_person && (
                <p className="text-sm text-slate-600 mt-1"><span className="text-slate-500">Contact:</span> {task.contact_person} {task.contact_phone ? `(${task.contact_phone})` : ""}</p>
              )}
            </section>
          )}

          {/* Cost Input */}
          <section className="rounded-xl border-2 border-dashed border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Cost Input</h3>
            {task.cost_submitted_at ? (
              <div className="text-sm">
                <p className="text-green-600 font-semibold">Cost Submitted: TZS {Number(task.partner_cost || 0).toLocaleString()}</p>
                {task.cost_notes && <p className="text-slate-500 mt-1">{task.cost_notes}</p>}
                <p className="text-xs text-slate-400 mt-1">Submitted {new Date(task.cost_submitted_at).toLocaleDateString("en-GB")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Your Cost (TZS)</label>
                  <input
                    type="number"
                    value={costInput}
                    onChange={(e) => setCostInput(e.target.value)}
                    placeholder="Enter your cost for this task"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                    data-testid="cost-input"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Notes (optional)</label>
                  <textarea
                    value={costNotes}
                    onChange={(e) => setCostNotes(e.target.value)}
                    placeholder="Add cost breakdown or notes..."
                    className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/20 resize-none"
                    rows={2}
                    data-testid="cost-notes-input"
                  />
                </div>
                <button
                  onClick={submitCost}
                  disabled={submitting || !costInput}
                  className="w-full rounded-xl bg-[#20364D] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#17283c] disabled:opacity-40 flex items-center justify-center gap-2"
                  data-testid="submit-cost-btn"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Cost
                </button>
              </div>
            )}
          </section>

          {/* Status Update */}
          {statusActions.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Update Status</h3>
              <div className="flex flex-wrap gap-2">
                {statusActions.map((action) => (
                  <button
                    key={action.status}
                    onClick={() => updateStatus(action.status)}
                    className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                      action.status === "delayed" || action.status === "failed"
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : action.status === "completed" || action.status === "delivered"
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-[#20364D]/10 text-[#20364D] hover:bg-[#20364D]/20"
                    }`}
                    data-testid={`status-action-${action.status}`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Proof Upload */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Proof / Attachment</h3>
            {task.proof_url ? (
              <div className="text-sm">
                <a href={task.proof_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">View Proof</a>
                {task.proof_notes && <p className="text-slate-500 mt-1">{task.proof_notes}</p>}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                <Upload className="w-5 h-5 text-slate-400" />
                <p className="text-sm text-slate-500">Proof upload will be available when task reaches completion.</p>
              </div>
            )}
          </section>

          {/* Notes */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Notes</h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                data-testid="add-note-input"
                onKeyDown={(e) => e.key === "Enter" && addNote()}
              />
              <button onClick={addNote} className="rounded-xl bg-[#20364D] text-white px-4 py-2 text-sm font-medium hover:bg-[#17283c]" data-testid="add-note-btn">
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
            {(task.notes || []).length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {task.notes.map((n, i) => (
                  <div key={i} className="text-sm bg-slate-50 rounded-lg p-2.5">
                    <p>{n.text}</p>
                    <p className="text-xs text-slate-400 mt-1">{n.by} — {new Date(n.at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Timeline */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Timeline</h3>
            <div className="space-y-2">
              {(task.timeline || []).slice().reverse().map((entry, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-[#20364D] mt-1.5 shrink-0" />
                  <div>
                    <p className="text-slate-700">{entry.note}</p>
                    <p className="text-xs text-slate-400">{entry.by} — {new Date(entry.at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


// ────────── Main Page ──────────
export default function PartnerAssignedWorkPage() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [taskList, statsData] = await Promise.all([
        apiFetch("/api/partner-portal/assigned-work"),
        apiFetch("/api/partner-portal/assigned-work/stats"),
      ]);
      setTasks(taskList);
      setStats(statsData);
    } catch (err) {
      console.error("Failed to load assigned work:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const refresh = () => {
    loadData();
    if (selectedTask) {
      apiFetch(`/api/partner-portal/assigned-work`).then((list) => {
        const updated = list.find((t) => t.id === selectedTask.id);
        if (updated) setSelectedTask(updated);
        else setSelectedTask(null);
      });
    }
  };

  const urgent = tasks.filter((t) => ["assigned", "awaiting_cost", "delayed"].includes(t.status));

  const filtered = tasks.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (t.task_ref || "").toLowerCase().includes(q) ||
        (t.service_type || "").toLowerCase().includes(q) ||
        (t.scope || "").toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6" data-testid="assigned-work-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">Assigned Work</h1>
          <p className="text-sm text-slate-500 mt-1">View assigned tasks, submit costs, and update execution status.</p>
        </div>
        <button onClick={loadData} className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50" data-testid="refresh-btn">
          Refresh
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Assigned" value={stats.assigned || 0} icon={ClipboardList} color="bg-blue-100 text-blue-600" />
        <KpiCard label="Awaiting Cost" value={stats.awaiting_cost || 0} icon={Clock} color="bg-amber-100 text-amber-600" />
        <KpiCard label="In Progress" value={stats.in_progress || 0} icon={Loader2} color="bg-indigo-100 text-indigo-600" />
        <KpiCard label="Completed" value={stats.completed || 0} icon={CheckCircle} color="bg-green-100 text-green-600" />
        <KpiCard label="Delayed" value={stats.delayed || 0} icon={AlertTriangle} color="bg-red-100 text-red-600" />
      </div>

      {/* Work Requiring Action */}
      {urgent.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
          <h2 className="text-sm font-bold text-amber-800 uppercase mb-3" data-testid="work-requiring-action-title">Work Requiring Action</h2>
          <div className="space-y-2">
            {urgent.slice(0, 5).map((task) => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="flex items-center justify-between bg-white rounded-xl p-3.5 border border-amber-100 hover:border-amber-300 cursor-pointer transition"
                data-testid={`urgent-task-${task.id}`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <span className="text-sm font-semibold text-[#20364D]">{task.task_ref}</span>
                    <span className="text-xs text-slate-500 ml-2 capitalize">{task.service_type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={task.status} />
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks..."
          className="flex-1 rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
          data-testid="search-tasks"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
          data-testid="status-filter"
        >
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
          <p className="text-sm text-slate-500 mt-2">Loading tasks...</p>
        </div>
      ) : (
        <div className="rounded-2xl border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left" data-testid="assigned-work-table">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Task Ref</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Service Type</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Scope</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Deadline</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center">
                      <ClipboardList className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                      <h3 className="text-base font-semibold text-slate-700">No assigned work yet</h3>
                      <p className="text-sm text-slate-500 mt-1">Assigned tasks will appear here when available.</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((task) => (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="border-b last:border-b-0 hover:bg-slate-50 cursor-pointer transition"
                      data-testid={`task-row-${task.id}`}
                    >
                      <td className="px-5 py-3.5 font-semibold text-sm text-[#20364D]">{task.task_ref}</td>
                      <td className="px-5 py-3.5 text-sm capitalize">{task.service_type}{task.service_subtype ? ` — ${task.service_subtype}` : ""}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{task.scope || task.description?.substring(0, 40) || "—"}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                        {task.deadline ? new Date(task.deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={task.status} /></td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                          className="rounded-lg bg-[#20364D] text-white px-3 py-1.5 text-xs font-medium hover:bg-[#17283c] transition"
                          data-testid={`view-task-${task.id}`}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}
