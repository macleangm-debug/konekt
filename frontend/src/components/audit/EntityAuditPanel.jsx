import React, { useEffect, useState } from "react";
import api from "../../lib/api";

export default function EntityAuditPanel({ entityType, entityId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!entityType || !entityId) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get(`/api/admin/audit/entity/${entityType}/${entityId}`);
        setLogs(res.data || []);
      } catch (error) {
        console.error("Failed to load entity audit logs:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [entityType, entityId]);

  const getActionBadgeColor = (action) => {
    if (action?.includes("create")) return "bg-green-100 text-green-700";
    if (action?.includes("update")) return "bg-blue-100 text-blue-700";
    if (action?.includes("delete")) return "bg-red-100 text-red-700";
    if (action?.includes("send")) return "bg-purple-100 text-purple-700";
    return "bg-slate-100 text-slate-700";
  };

  if (loading) {
    return (
      <div className="rounded-3xl border bg-white p-6">
        <h2 className="text-2xl font-bold">Activity History</h2>
        <div className="mt-5 flex justify-center">
          <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border bg-white p-6" data-testid="entity-audit-panel">
      <h2 className="text-2xl font-bold">Activity History</h2>
      <div className="space-y-3 mt-5">
        {logs.map((item) => (
          <div key={item.id} className="rounded-2xl border bg-slate-50 p-4" data-testid={`audit-item-${item.id}`}>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getActionBadgeColor(item.action)}`}>
                {item.action}
              </span>
            </div>
            <div className="text-sm text-slate-500 mt-2">
              {item.actor_email || "System"} &bull; {item.actor_role || "-"}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
            </div>
          </div>
        ))}
        {!logs.length && (
          <div className="text-sm text-slate-500">No activity history yet.</div>
        )}
      </div>
    </div>
  );
}
