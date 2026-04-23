import React, { useEffect, useState, useCallback } from "react";
import { UserCog, Clock, ShieldAlert, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";

const formatDuration = (secs) => {
  if (!secs && secs !== 0) return "Active";
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
};

export default function AdminImpersonationLogPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/api/admin/impersonation-log");
      setRows(r.data || []);
    } catch {
      toast.error("Failed to load log");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) =>
    !q || [r.target_name, r.impersonator_email, r.reason].some((f) => (f || "").toLowerCase().includes(q.toLowerCase()))
  );

  const active = filtered.filter((r) => !r.ended_at).length;

  return (
    <div className="p-6 space-y-6" data-testid="admin-impersonation-log-page">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">Impersonation Audit Log</h1>
          <p className="text-sm text-slate-500 mt-1">Every time an admin or Ops user steps into a partner account — who, when, why, and for how long.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-2xl p-5">
          <div className="text-xs uppercase font-semibold text-slate-500">Total sessions</div>
          <div className="text-2xl font-bold mt-1 text-[#20364D]" data-testid="stat-total-sessions">{filtered.length}</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="text-xs uppercase font-semibold text-amber-700">Currently active</div>
          <div className="text-2xl font-bold mt-1 text-[#20364D]" data-testid="stat-active-sessions">{active}</div>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
          <div className="text-xs uppercase font-semibold text-indigo-700">Unique impersonators</div>
          <div className="text-2xl font-bold mt-1 text-[#20364D]" data-testid="stat-unique-impersonators">{new Set(filtered.map((r) => r.impersonator_email || r.impersonator_id)).size}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border">
        <div className="p-4 border-b flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><UserCog className="w-5 h-5 text-[#20364D]" /><h2 className="font-bold text-[#20364D]">Sessions</h2></div>
          <Input placeholder="Search target / impersonator / reason…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" data-testid="log-search" />
        </div>
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No impersonation sessions yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Started</th>
                <th className="text-left px-4 py-3">Impersonator</th>
                <th className="text-left px-4 py-3">Target</th>
                <th className="text-left px-4 py-3">Reason</th>
                <th className="text-left px-4 py-3">Duration</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t hover:bg-slate-50/40" data-testid={`log-row-${r.id}`}>
                  <td className="px-4 py-3 text-xs text-slate-600">{String(r.started_at || "").slice(0, 19).replace("T", " ")}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{r.impersonator_email || r.impersonator_id}</div>
                    <div className="text-[11px] text-slate-400">{r.impersonator_role}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{r.target_name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{r.target_id}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-[250px] truncate" title={r.reason}>{r.reason || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-xs"><span className="inline-flex items-center gap-1 text-slate-600"><Clock className="w-3 h-3" /> {formatDuration(r.duration_seconds)}</span></td>
                  <td className="px-4 py-3">
                    {r.ended_at
                      ? <Badge className="bg-slate-100 text-slate-700 text-[10px]">Ended</Badge>
                      : <Badge className="bg-amber-100 text-amber-800 text-[10px] animate-pulse"><ShieldAlert className="w-3 h-3 mr-1" /> Active</Badge>}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{r.ip || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
