import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Building2, User, ExternalLink, FileText, Phone, RefreshCw, UserCog } from "lucide-react";
import DormantStatusBadge from "../../components/clients/DormantStatusBadge";
import { Button } from "../../components/ui/button";
import api from "../../lib/api";

export default function DormantClientAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (ownerFilter) params.owner = ownerFilter;

      const [alertsRes, summaryRes] = await Promise.all([
        api.get("/api/admin/dormant-clients/alerts", { params }),
        api.get("/api/admin/dormant-clients/summary"),
      ]);
      setAlerts(alertsRes.data.alerts || []);
      setSummary(summaryRes.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [statusFilter, ownerFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleReactivate = async (clientId) => {
    try {
      await api.post(`/api/admin/dormant-clients/${clientId}/reactivate`);
      fetchData();
    } catch {}
  };

  const owners = summary?.by_owner || [];
  const counts = summary?.summary || {};

  const statusTabs = [
    { key: "", label: "All Dormant", count: (counts.at_risk || 0) + (counts.inactive || 0) + (counts.lost || 0) },
    { key: "at_risk", label: "At Risk", count: counts.at_risk || 0 },
    { key: "inactive", label: "Inactive", count: counts.inactive || 0 },
    { key: "lost", label: "Lost", count: counts.lost || 0 },
  ];

  return (
    <div className="space-y-5" data-testid="dormant-clients-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h1 className="text-xl font-bold text-slate-900">Dormant Client Alerts</h1>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} data-testid="refresh-dormant-btn">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Owner Breakdown Cards */}
      {owners.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {owners.filter(o => o.total > 0 && o.owner_sales_id !== "unassigned").slice(0, 8).map((o) => (
            <div
              key={o.owner_sales_id}
              className={`rounded-xl border p-3 cursor-pointer transition-all hover:shadow-sm ${ownerFilter === o.owner_sales_id ? "border-blue-400 bg-blue-50/50 ring-1 ring-blue-200" : "bg-white"}`}
              onClick={() => setOwnerFilter(ownerFilter === o.owner_sales_id ? "" : o.owner_sales_id)}
              data-testid={`owner-card-${o.owner_sales_id}`}
            >
              <div className="text-xs text-slate-500 truncate">{o.owner_name || "Unknown"}</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-bold">{o.total - (o.active || 0)}</span>
                <span className="text-xs text-slate-400">dormant</span>
              </div>
              <div className="flex gap-2 mt-1.5 text-[10px]">
                {o.at_risk > 0 && <span className="text-amber-600">{o.at_risk} risk</span>}
                {o.inactive > 0 && <span className="text-orange-600">{o.inactive} inactive</span>}
                {o.lost > 0 && <span className="text-red-600">{o.lost} lost</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex gap-1 border-b pb-0" data-testid="dormant-status-tabs">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              statusFilter === tab.key
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            data-testid={`dormant-tab-${tab.key || "all"}`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Alerts Table */}
      <div className="overflow-hidden rounded-xl border bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading dormant clients...</div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center" data-testid="no-dormant-clients">
            <AlertTriangle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-semibold text-slate-700">No data available yet</h3>
            <p className="text-sm text-slate-500 mt-1">Data will appear once activity is recorded</p>
          </div>
        ) : (
          <table className="w-full text-sm" data-testid="dormant-clients-table">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-600">Client</th>
                <th className="px-4 py-3 font-medium text-slate-600">Type</th>
                <th className="px-4 py-3 font-medium text-slate-600">Owner</th>
                <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 font-medium text-slate-600">Days Inactive</th>
                <th className="px-4 py-3 font-medium text-slate-600">Last Activity</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {alerts.map((row) => (
                <tr key={row.client_id} className="hover:bg-slate-50/60" data-testid={`dormant-row-${row.client_id}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {row.client_type === "company" ? (
                        <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                      ) : (
                        <User className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                      <div>
                        <div className="font-medium text-slate-900">{row.client_name}</div>
                        <div className="text-xs text-slate-400">{row.client_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 capitalize">{row.client_type}</td>
                  <td className="px-4 py-3 text-slate-600">{row.owner_name || "-"}</td>
                  <td className="px-4 py-3"><DormantStatusBadge status={row.status} /></td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-xs ${row.days_since_activity >= 180 ? "text-red-600 font-bold" : row.days_since_activity >= 90 ? "text-orange-600" : "text-amber-600"}`}>
                      {row.days_since_activity != null ? `${row.days_since_activity}d` : "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {row.last_activity_at ? new Date(row.last_activity_at).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 px-2 text-xs"
                        title="Open Client"
                        onClick={() => navigate(row.client_type === "company" ? `/admin/client-reassignment` : `/admin/client-reassignment`)}
                        data-testid={`open-client-${row.client_id}`}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 px-2 text-xs"
                        title="Create Quote"
                        onClick={() => navigate("/admin/quotes/new")}
                        data-testid={`create-quote-${row.client_id}`}
                      >
                        <FileText className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 px-2 text-xs"
                        title="Create Follow-up"
                        data-testid={`create-followup-${row.client_id}`}
                      >
                        <Phone className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        className="h-7 px-2 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        title="Mark Reactivated"
                        onClick={() => handleReactivate(row.client_id)}
                        data-testid={`reactivate-${row.client_id}`}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" /> Reactivate
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 px-2 text-xs"
                        title="Reassign"
                        onClick={() => navigate("/admin/client-reassignment")}
                        data-testid={`reassign-${row.client_id}`}
                      >
                        <UserCog className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
