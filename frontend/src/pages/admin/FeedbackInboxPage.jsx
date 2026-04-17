import React, { useState, useEffect, useCallback } from "react";
import { MessageCircle, Bug, CreditCard, Package, Lightbulb, HelpCircle, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const CAT_ICONS = {
  bug: Bug, payment_issue: CreditCard, order_issue: Package,
  feature_request: Lightbulb, general: HelpCircle,
};
const CAT_COLORS = {
  bug: "bg-red-100 text-red-700", payment_issue: "bg-amber-100 text-amber-700",
  order_issue: "bg-blue-100 text-blue-700", feature_request: "bg-purple-100 text-purple-700",
  general: "bg-slate-100 text-slate-700",
};
const STATUS_COLORS = {
  new: "bg-red-100 text-red-700", in_progress: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700", dismissed: "bg-slate-100 text-slate-500",
};
const PRIORITY_COLORS = {
  high: "bg-red-50 text-red-600", medium: "bg-amber-50 text-amber-600", low: "bg-slate-50 text-slate-500",
};

const fmtDate = (d) => {
  if (!d) return "-";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return d; }
};

export default function FeedbackInboxPage() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      const [itemsRes, statsRes] = await Promise.all([
        api.get(`/api/feedback${filter ? `?status=${filter}` : ""}`),
        api.get("/api/feedback/stats"),
      ]);
      setItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
      setStats(statsRes.data || {});
    } catch { setItems([]); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, newStatus) => {
    try {
      await api.patch(`/api/feedback/${id}`, { status: newStatus });
      toast.success(`Feedback marked as ${newStatus}`);
      load();
      if (selected?.id === id) setSelected({ ...selected, status: newStatus });
    } catch { toast.error("Failed to update"); }
  };

  return (
    <div className="space-y-6" data-testid="feedback-inbox-page">
      <div>
        <h1 className="text-2xl font-bold text-[#20364D] flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-[#D4A843]" /> Feedback Inbox
        </h1>
        <p className="text-sm text-slate-500 mt-1">User-reported issues and improvement suggestions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "New", value: stats.new || 0, color: "border-red-200 bg-red-50", icon: AlertTriangle },
          { label: "In Progress", value: stats.in_progress || 0, color: "border-amber-200 bg-amber-50", icon: Clock },
          { label: "Resolved", value: stats.resolved || 0, color: "border-emerald-200 bg-emerald-50", icon: CheckCircle },
          { label: "Total", value: stats.total || 0, color: "border-slate-200 bg-slate-50", icon: MessageCircle },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`} data-testid={`stat-${s.label.toLowerCase()}`}>
            <s.icon className="w-4 h-4 text-slate-500 mb-1" />
            <div className="text-2xl font-bold text-[#20364D]">{s.value}</div>
            <div className="text-[10px] font-bold uppercase text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["", "new", "in_progress", "resolved"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filter === f ? "bg-[#20364D] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {f === "" ? "All" : f.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading feedback...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white border rounded-2xl">
          <MessageCircle className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">No feedback yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const CatIcon = CAT_ICONS[item.category] || HelpCircle;
            return (
              <div key={item.id} onClick={() => setSelected(item)} className="bg-white border rounded-xl p-4 hover:shadow-sm transition cursor-pointer" data-testid={`feedback-item-${item.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                      <CatIcon className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 line-clamp-2">{item.description}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${CAT_COLORS[item.category] || CAT_COLORS.general}`}>{item.category_label}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${STATUS_COLORS[item.status] || STATUS_COLORS.new}`}>{item.status}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium}`}>{item.priority}</span>
                        <span className="text-[10px] text-slate-400">{item.user_email || "Anonymous"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 shrink-0">{fmtDate(item.created_at)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()} data-testid="feedback-detail-drawer">
            <div className="p-6 border-b bg-[#20364D] text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Feedback Detail</h2>
                <button onClick={() => setSelected(null)} className="text-white/60 hover:text-white text-xl">&times;</button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Description</label>
                <p className="text-sm text-slate-800 mt-1">{selected.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><label className="text-[10px] text-slate-400">Category</label><div className="font-medium">{selected.category_label}</div></div>
                <div><label className="text-[10px] text-slate-400">Priority</label><div className="font-medium">{selected.priority}</div></div>
                <div><label className="text-[10px] text-slate-400">User</label><div className="font-medium">{selected.user_name || selected.user_email || "Anonymous"}</div></div>
                <div><label className="text-[10px] text-slate-400">Role</label><div className="font-medium">{selected.user_role || "-"}</div></div>
                <div><label className="text-[10px] text-slate-400">Page</label><div className="font-medium text-xs truncate">{selected.page_url || "-"}</div></div>
                <div><label className="text-[10px] text-slate-400">Submitted</label><div className="font-medium">{fmtDate(selected.created_at)}</div></div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Update Status</label>
                <div className="flex gap-2 flex-wrap">
                  {["new", "in_progress", "resolved", "dismissed"].map((s) => (
                    <button key={s} onClick={() => updateStatus(selected.id, s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selected.status === s ? "bg-[#20364D] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                      {s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
