import React, { useEffect, useState } from "react";
import api from "../../lib/api";

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    actor_email: "",
    entity_type: "",
    action: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.actor_email) params.actor_email = filters.actor_email;
      if (filters.entity_type) params.entity_type = filters.entity_type;
      if (filters.action) params.action = filters.action;

      const res = await api.get("/api/admin/audit", { params });
      setLogs(res.data || []);
    } catch (error) {
      console.error("Failed to load audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const clearFilters = () => {
    setFilters({ actor_email: "", entity_type: "", action: "" });
    load();
  };

  const getActionBadgeColor = (action) => {
    if (action?.includes("create")) return "bg-green-100 text-green-700";
    if (action?.includes("update")) return "bg-blue-100 text-blue-700";
    if (action?.includes("delete")) return "bg-red-100 text-red-700";
    if (action?.includes("send")) return "bg-purple-100 text-purple-700";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-none w-full space-y-6">
        <div className="text-left">
          <h1 className="text-4xl font-bold" data-testid="audit-log-title">Audit Log</h1>
          <p className="mt-2 text-slate-600">
            Track key system actions for accountability, review, and fraud prevention.
          </p>
        </div>

        <div className="rounded-3xl border bg-white p-6">
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Actor Email</label>
              <input
                className="border rounded-xl px-4 py-3 w-[200px]"
                placeholder="Filter by email"
                value={filters.actor_email}
                onChange={(e) => setFilters({ ...filters, actor_email: e.target.value })}
                data-testid="filter-actor-email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Entity Type</label>
              <input
                className="border rounded-xl px-4 py-3 w-[150px]"
                placeholder="e.g., quote"
                value={filters.entity_type}
                onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
                data-testid="filter-entity-type"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Action</label>
              <input
                className="border rounded-xl px-4 py-3 w-[150px]"
                placeholder="e.g., create"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                data-testid="filter-action"
              />
            </div>
            <button
              type="button"
              onClick={load}
              className="rounded-xl bg-[#2D3E50] text-white px-5 py-3 font-medium"
              data-testid="apply-filters-btn"
            >
              Apply Filters
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border px-5 py-3 font-medium"
              data-testid="clear-filters-btn"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="rounded-3xl border bg-white overflow-hidden" data-testid="audit-table">
          {loading ? (
            <div className="p-10 text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-5 py-4 text-sm font-semibold">Date</th>
                    <th className="px-5 py-4 text-sm font-semibold">Actor</th>
                    <th className="px-5 py-4 text-sm font-semibold">Role</th>
                    <th className="px-5 py-4 text-sm font-semibold">Action</th>
                    <th className="px-5 py-4 text-sm font-semibold">Entity</th>
                    <th className="px-5 py-4 text-sm font-semibold">Label</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((item) => (
                    <tr key={item.id} className="border-b last:border-b-0 hover:bg-slate-50" data-testid={`audit-row-${item.id}`}>
                      <td className="px-5 py-4 text-sm">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                      </td>
                      <td className="px-5 py-4 text-sm">{item.actor_email || "-"}</td>
                      <td className="px-5 py-4 text-sm">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                          {item.actor_role || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getActionBadgeColor(item.action)}`}>
                          {item.action}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {item.entity_type} / <span className="font-mono text-xs">{item.entity_id?.substring(0, 8)}...</span>
                      </td>
                      <td className="px-5 py-4 text-sm">{item.entity_label || "-"}</td>
                    </tr>
                  ))}

                  {!logs.length && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                        No audit records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="text-sm text-slate-500">
          Showing {logs.length} audit records
        </div>
      </div>
    </div>
  );
}
