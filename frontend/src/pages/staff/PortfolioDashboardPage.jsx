import React, { useEffect, useState, useCallback } from "react";
import {
  Building2, User, TrendingUp, TrendingDown, AlertTriangle, Clock,
  FileText, Phone, Mail, Plus, CheckCircle2, XCircle, BarChart3,
} from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { toast } from "sonner";

const CLASS_BADGES = {
  active: { bg: "bg-emerald-100 text-emerald-700", label: "Active" },
  at_risk: { bg: "bg-amber-100 text-amber-700", label: "At Risk" },
  inactive: { bg: "bg-red-100 text-red-700", label: "Inactive" },
  lost: { bg: "bg-slate-200 text-slate-600", label: "Lost" },
};

const OUTCOME_OPTIONS = [
  { value: "reactivated", label: "Reactivated", icon: CheckCircle2, color: "text-emerald-600" },
  { value: "no_response", label: "No Response", icon: Clock, color: "text-amber-600" },
  { value: "not_interested", label: "Not Interested", icon: XCircle, color: "text-red-600" },
  { value: "lost", label: "Lost", icon: TrendingDown, color: "text-slate-500" },
];

function StatCard({ label, value, icon: Icon, accent = "border-slate-200" }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border bg-white p-4 ${accent}`} data-testid={`portfolio-stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
        <Icon className="h-5 w-5 text-slate-600" />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-[#20364D]">{value}</div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      </div>
    </div>
  );
}

function ClientRow({ client, onAction }) {
  const cls = CLASS_BADGES[client.classification] || CLASS_BADGES.inactive;
  const fmtDate = (d) => {
    if (!d) return "No activity";
    try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return d; }
  };
  const fmtMoney = (v) => {
    if (!v) return "—";
    return new Intl.NumberFormat("en-TZ", { style: "currency", currency: "TZS", maximumFractionDigits: 0 }).format(v);
  };

  return (
    <tr className="hover:bg-slate-50/50 transition-colors" data-testid={`client-row-${client.id}`}>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          {client.type === "company"
            ? <Building2 className="h-4 w-4 text-blue-500 shrink-0" />
            : <User className="h-4 w-4 text-emerald-500 shrink-0" />}
          <div className="min-w-0">
            <div className="font-semibold text-[#20364D] text-sm truncate">{client.name}</div>
            <div className="text-xs text-slate-400 truncate">{client.domain || client.email || ""}</div>
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${cls.bg}`}>{cls.label}</span>
      </td>
      <td className="px-5 py-3 text-xs text-slate-500">{fmtDate(client.last_activity)}</td>
      <td className="px-5 py-3 text-sm font-medium text-[#20364D]">{fmtMoney(client.revenue)}</td>
      <td className="px-5 py-3">
        <div className="flex gap-1">
          <button onClick={() => onAction("quote", client)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors" title="Create Quote" data-testid={`action-quote-${client.id}`}>
            <FileText className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onAction("email", client)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors" title="Email" data-testid={`action-email-${client.id}`}>
            <Mail className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onAction("call", client)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors" title="Call" data-testid={`action-call-${client.id}`}>
            <Phone className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function TaskCard({ task, onUpdate }) {
  const cls = CLASS_BADGES[task.classification] || CLASS_BADGES.inactive;
  const fmtDate = (d) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }); }
    catch { return d; }
  };
  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  return (
    <div className={`rounded-xl border bg-white p-4 ${isOverdue ? "border-red-200" : "border-slate-200"}`} data-testid={`task-card-${task.id}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-[#20364D]">{task.entity_name}</span>
            <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${cls.bg}`}>{cls.label}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{task.suggested_action}</p>
        </div>
        <span className={`text-[10px] font-medium shrink-0 ${isOverdue ? "text-red-600" : "text-slate-400"}`}>
          {isOverdue ? "Overdue" : ""} Due {fmtDate(task.due_date)}
        </span>
      </div>
      {task.status === "pending" && (
        <div className="flex gap-1.5 mt-3">
          {OUTCOME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate(task.id, opt.value)}
              className={`flex items-center gap-1 text-[10px] font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 ${opt.color} transition-colors`}
              data-testid={`task-outcome-${opt.value}-${task.id}`}
            >
              <opt.icon className="h-3 w-3" /> {opt.label}
            </button>
          ))}
        </div>
      )}
      {task.status === "completed" && task.outcome && (
        <div className="mt-2 text-xs text-slate-500">
          Outcome: <span className="font-medium capitalize">{task.outcome.replace("_", " ")}</span>
        </div>
      )}
    </div>
  );
}

export default function PortfolioDashboardPage() {
  const [portfolio, setPortfolio] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [portRes, taskRes] = await Promise.all([
        adminApi.getMyPortfolio(),
        adminApi.getMyReactivationTasks(),
      ]);
      setPortfolio(portRes.data);
      setTasks(taskRes.data?.tasks || []);
    } catch {
      toast.error("Failed to load portfolio");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGenerateTasks = async () => {
    setGenerating(true);
    try {
      const res = await adminApi.generateReactivationTasks();
      toast.success(`Generated ${res.data?.tasks_created || 0} reactivation tasks`);
      load();
    } catch {
      toast.error("Failed to generate tasks");
    }
    setGenerating(false);
  };

  const handleTaskOutcome = async (taskId, outcome) => {
    try {
      await adminApi.updateReactivationTask(taskId, { status: "completed", outcome });
      toast.success(`Task marked: ${outcome.replace("_", " ")}`);
      load();
    } catch {
      toast.error("Failed to update task");
    }
  };

  const handleClientAction = (action, client) => {
    if (action === "email" && (client.email || client.domain)) {
      const email = client.email || `contact@${client.domain}`;
      window.open(`mailto:${email}`, "_blank");
    } else if (action === "call") {
      toast.info(`Open client detail to find phone number for ${client.name}`);
    } else if (action === "quote") {
      toast.info(`Navigate to Quotes to create a new quote for ${client.name}`);
    }
  };

  const fmtMoney = (v) => {
    if (!v) return "TZS 0";
    return new Intl.NumberFormat("en-TZ", { style: "currency", currency: "TZS", maximumFractionDigits: 0 }).format(v);
  };

  if (loading) {
    return (
      <div className="space-y-5" data-testid="portfolio-loading">
        <div><h1 className="text-2xl font-bold text-[#20364D]">My Portfolio</h1></div>
        <div className="py-16 text-center text-sm text-slate-400">Loading portfolio...</div>
      </div>
    );
  }

  const clients = portfolio?.clients || [];
  const filtered = filter === "all" ? clients : clients.filter(c => c.classification === filter);
  const pendingTasks = tasks.filter(t => t.status === "pending");

  return (
    <div className="space-y-5" data-testid="portfolio-dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">My Portfolio</h1>
          <p className="mt-0.5 text-sm text-slate-500">Your client portfolio, activity tracking, and reactivation tasks.</p>
        </div>
        <button
          onClick={handleGenerateTasks}
          disabled={generating}
          className="flex items-center gap-2 rounded-xl bg-[#20364D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2a4560] disabled:opacity-50 transition-colors"
          data-testid="generate-tasks-btn"
        >
          <Plus className="h-4 w-4" /> {generating ? "Generating..." : "Generate Tasks"}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6" data-testid="portfolio-stats">
        <StatCard label="Total Clients" value={portfolio?.total_clients || 0} icon={Building2} />
        <StatCard label="Active" value={portfolio?.buckets?.active || 0} icon={TrendingUp} accent="border-emerald-200" />
        <StatCard label="At Risk" value={portfolio?.buckets?.at_risk || 0} icon={AlertTriangle} accent="border-amber-200" />
        <StatCard label="Inactive" value={portfolio?.buckets?.inactive || 0} icon={TrendingDown} accent="border-red-200" />
        <StatCard label="Revenue" value={fmtMoney(portfolio?.total_revenue)} icon={BarChart3} />
        <StatCard label="Overdue Tasks" value={portfolio?.overdue_followups || 0} icon={Clock} accent={portfolio?.overdue_followups > 0 ? "border-red-200" : "border-slate-200"} />
      </div>

      {/* Reactivation Tasks */}
      {pendingTasks.length > 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/30 shadow-sm" data-testid="reactivation-tasks">
          <div className="flex items-center justify-between border-b border-amber-100 px-5 py-3.5">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reactivation Tasks ({pendingTasks.length})</h3>
          </div>
          <div className="p-4 space-y-3">
            {pendingTasks.slice(0, 8).map((task) => (
              <TaskCard key={task.id} task={task} onUpdate={handleTaskOutcome} />
            ))}
          </div>
        </div>
      )}

      {/* Client List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid="client-list">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Client Portfolio ({filtered.length})
          </h3>
          <div className="flex gap-1">
            {["all", "active", "at_risk", "inactive", "lost"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors ${filter === f ? "bg-[#20364D] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                data-testid={`filter-${f}`}
              >
                {f === "all" ? "All" : f === "at_risk" ? "At Risk" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-left">
                <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Client</th>
                <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Last Activity</th>
                <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Revenue</th>
                <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">No clients in this category</td></tr>
              ) : filtered.map((client) => (
                <ClientRow key={client.id} client={client} onAction={handleClientAction} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
