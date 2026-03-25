import React, { useEffect, useState } from "react";
import adminApi from "../../lib/adminApi";
import FilterBar from "../../components/admin/shared/FilterBar";
import EmptyState from "../../components/admin/shared/EmptyState";
import { ScrollText } from "lucide-react";

function fmtDate(d) { return d ? new Date(d).toLocaleString() : "-"; }

const ACTION_COLORS = {
  payment_approved: "bg-green-100 text-green-800",
  payment_rejected: "bg-red-100 text-red-700",
  manual_release_to_vendor: "bg-amber-100 text-amber-800",
  role_assigned: "bg-indigo-100 text-indigo-700",
  status_changed: "bg-blue-100 text-blue-800",
};

export default function AuditLogPageV2() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [actions, setActions] = useState([]);

  const load = () => {
    setLoading(true);
    adminApi.getAuditLogs({ search: search || undefined, action: actionFilter || undefined })
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    adminApi.getAuditActions().then(res => setActions(Array.isArray(res.data) ? res.data : [])).catch(() => {});
    load();
  }, []);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search, actionFilter]);

  return (
    <div data-testid="audit-log-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#20364D]">Audit Log</h1>
        <p className="text-slate-500 mt-1 text-sm">Track all administrative actions: approvals, rejections, releases, role changes.</p>
      </div>

      <FilterBar search={search} onSearchChange={setSearch}
        filters={[{
          key: "action", value: actionFilter, onChange: setActionFilter,
          options: [{ value: "", label: "All Actions" }, ...actions.map(a => ({ value: a, label: a.replace(/_/g, " ") }))],
        }]}
      />

      {loading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}</div>
      ) : rows.length > 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="audit-table">
              <thead>
                <tr className="text-left border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Target</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Actor</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Details</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50" data-testid={`audit-row-${idx}`}>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ACTION_COLORS[row.action] || "bg-slate-100 text-slate-600"}`}>
                        {(row.action || "").replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#20364D] text-xs">{row.target_id?.slice(0, 20) || "-"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 capitalize hidden md:table-cell">{row.actor_role || "-"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell max-w-[200px] truncate">
                      {row.details ? Object.entries(row.details).map(([k,v]) => `${k}: ${v}`).join(", ") : "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={ScrollText} title="No audit entries" description="Administrative actions will be logged here." />
      )}
    </div>
  );
}
