import React, { useEffect, useState, useCallback } from "react";
import api from "../../../lib/api";
import AppLoader from "../../../components/branding/AppLoader";
import { useBranding } from "../../../contexts/BrandingContext";
import { exportCSV, exportPDF, fmtMoney } from "../../../lib/reportExportUtils";
import {
  AlertTriangle, ShieldAlert, Clock, CheckCircle, XCircle,
  Star, BadgePercent, Package, Users, Filter, Search,
  ChevronDown, ChevronUp, X
} from "lucide-react";

const TYPE_CONFIG = {
  rating: { icon: Star, color: "text-amber-600", bg: "bg-amber-50", label: "Rating" },
  discount: { icon: BadgePercent, color: "text-red-600", bg: "bg-red-50", label: "Discount" },
  delay: { icon: Clock, color: "text-blue-600", bg: "bg-blue-50", label: "Delay" },
  product: { icon: Package, color: "text-purple-600", bg: "bg-purple-50", label: "Product" },
  performance: { icon: Users, color: "text-teal-600", bg: "bg-teal-50", label: "Performance" },
};

const SEV_STYLE = {
  critical: "border-l-red-500 bg-red-50/50",
  warning: "border-l-amber-500 bg-amber-50/30",
  info: "border-l-blue-500 bg-blue-50/30",
};

const SEV_BADGE = {
  critical: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  info: "bg-blue-100 text-blue-700",
};

export default function AlertDashboardPage() {
  const branding = useBranding();
  const [data, setData] = useState({ kpis: {}, alerts: [] });
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState("");
  const [alertType, setAlertType] = useState("");
  const [status, setStatus] = useState("open");
  const [selectedAlert, setSelectedAlert] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (severity) params.set("severity", severity);
      if (alertType) params.set("alert_type", alertType);
      if (status) params.set("status", status);
      const res = await api.get(`/api/admin/alerts?${params.toString()}`);
      setData(res.data);
    } catch {
      setData({ kpis: {}, alerts: [] });
    } finally {
      setLoading(false);
    }
  }, [severity, alertType, status]);

  useEffect(() => { load(); }, [load]);

  const generateAlerts = async () => {
    try {
      await api.post("/api/admin/alerts/generate");
      await load();
    } catch { /* silent */ }
  };

  const resolveAlert = async (alertId) => {
    try {
      await api.post(`/api/admin/alerts/${alertId}/resolve`);
      setSelectedAlert(null);
      await load();
    } catch { /* silent */ }
  };

  const handleExportCSV = () => {
    exportCSV("action-alerts",
      ["ID", "Type", "Severity", "Message", "Recommended Action", "Status", "Created"],
      data.alerts.map((a) => [a.alert_id, a.alert_type, a.severity, a.message, a.recommended_action, a.status, a.created_at?.slice(0, 10)])
    );
  };

  const k = data.kpis || {};

  return (
    <div className="space-y-6" data-testid="alert-dashboard-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#20364D]" data-testid="alert-title">Action Center</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor, prioritize, and resolve business alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={generateAlerts} className="flex items-center gap-1.5 rounded-lg bg-[#20364D] px-4 py-2 text-xs font-medium text-white hover:bg-[#2a4a6b] transition" data-testid="alert-refresh-btn">
            <AlertTriangle className="w-3.5 h-3.5" /> Scan for Alerts
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50" data-testid="alert-export-csv">
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="alert-kpi-row">
        <div className="rounded-xl border bg-white p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><ShieldAlert className="w-5 h-5 text-red-600" /></div>
          <div><p className="text-xs text-slate-500">Critical</p><p className="text-xl font-bold text-red-600">{k.critical || 0}</p></div>
        </div>
        <div className="rounded-xl border bg-white p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-xs text-slate-500">Warning</p><p className="text-xl font-bold text-amber-600">{k.warning || 0}</p></div>
        </div>
        <div className="rounded-xl border bg-white p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Clock className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-xs text-slate-500">Open</p><p className="text-xl font-bold text-blue-600">{k.open || 0}</p></div>
        </div>
        <div className="rounded-xl border bg-white p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-xs text-slate-500">Resolved</p><p className="text-xl font-bold text-green-600">{k.resolved || 0}</p></div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white border rounded-xl p-3" data-testid="alert-filter-bar">
        <Filter className="w-4 h-4 text-slate-400" />
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700" data-testid="alert-filter-severity">
          <option value="">All Severity</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <select value={alertType} onChange={(e) => setAlertType(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700" data-testid="alert-filter-type">
          <option value="">All Types</option>
          <option value="rating">Rating</option>
          <option value="discount">Discount</option>
          <option value="delay">Delay</option>
          <option value="product">Product</option>
          <option value="performance">Performance</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700" data-testid="alert-filter-status">
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Alert List */}
      <div className="space-y-2" data-testid="alert-list">
        {loading ? (
          <div className="text-center py-12"><AppLoader text="Loading alerts..." size="md" /></div>
        ) : data.alerts.length === 0 ? (
          <div className="text-center py-12 bg-white border rounded-2xl">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
            <p className="text-slate-500 font-medium">No alerts matching your filters</p>
            <p className="text-xs text-slate-400 mt-1">All clear — system is healthy</p>
          </div>
        ) : (
          data.alerts.map((alert) => {
            const tc = TYPE_CONFIG[alert.alert_type] || TYPE_CONFIG.delay;
            const TypeIcon = tc.icon;
            return (
              <div
                key={alert.alert_id}
                className={`border-l-4 rounded-xl bg-white border border-slate-100 p-4 cursor-pointer hover:shadow-md transition ${SEV_STYLE[alert.severity] || ""}`}
                onClick={() => setSelectedAlert(selectedAlert?.alert_id === alert.alert_id ? null : alert)}
                data-testid={`alert-card-${alert.alert_id}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tc.bg}`}>
                    <TypeIcon className={`w-4 h-4 ${tc.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SEV_BADGE[alert.severity] || "bg-slate-100 text-slate-600"}`}>
                        {alert.severity?.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-600 uppercase">{tc.label}</span>
                      {alert.status === "resolved" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">RESOLVED</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[#20364D] mt-1">{alert.message}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {alert.created_at?.slice(0, 10)} &middot; Assigned: {alert.assigned_to}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {selectedAlert?.alert_id === alert.alert_id
                      ? <ChevronUp className="w-4 h-4 text-slate-400" />
                      : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Detail */}
                {selectedAlert?.alert_id === alert.alert_id && (
                  <div className="mt-4 pt-4 border-t border-slate-100" data-testid={`alert-detail-${alert.alert_id}`}>
                    <div className="bg-slate-50 rounded-lg p-3 mb-3">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Recommended Action</p>
                      <p className="text-sm text-[#20364D]">{alert.recommended_action}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                      <div><span className="text-slate-400">Entity:</span> <span className="font-medium text-slate-700">{alert.entity_id}</span></div>
                      <div><span className="text-slate-400">Type:</span> <span className="font-medium text-slate-700">{alert.entity_type}</span></div>
                      <div><span className="text-slate-400">Priority:</span> <span className="font-medium text-slate-700">{alert.priority_score}</span></div>
                      <div><span className="text-slate-400">Created:</span> <span className="font-medium text-slate-700">{alert.created_at?.slice(0, 16).replace("T", " ")}</span></div>
                    </div>
                    {alert.status === "open" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); resolveAlert(alert.alert_id); }}
                        className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-700 transition"
                        data-testid={`alert-resolve-${alert.alert_id}`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Mark as Resolved
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
