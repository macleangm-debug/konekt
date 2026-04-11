import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { AlertTriangle, Loader2, Clock, CreditCard, UserX, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ALERT_ICONS = {
  overdue_followup: Clock,
  stale_lead: UserX,
  pending_payments: CreditCard,
};

const SEVERITY_STYLES = {
  critical: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  info: "bg-blue-100 text-blue-700",
};

const TYPE_LABELS = {
  overdue_followup: "Overdue Follow-Up",
  stale_lead: "Stale Lead",
  pending_payments: "Pending Payments",
};

const CTA_CONFIG = {
  overdue_followup: { label: "Open CRM", path: "/admin/crm" },
  stale_lead: { label: "Open CRM", path: "/admin/crm" },
  pending_payments: { label: "Review Payments", path: "/admin/finance/payments-queue" },
};

export default function TeamAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/team-performance/summary");
      setAlerts(res.data?.alerts || []);
    } catch { setAlerts([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const types = ["all", ...new Set(alerts.map((a) => a.type))];
  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.type === filter);

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5" data-testid="team-alerts-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#20364D]">Alerts</h1>
          <p className="text-sm text-slate-500 mt-0.5">Operational issues requiring attention</p>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && <Badge className="bg-red-100 text-red-700">{criticalCount} Critical</Badge>}
          {warningCount > 0 && <Badge className="bg-amber-100 text-amber-700">{warningCount} Warning</Badge>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden w-fit">
        {types.map((t) => (
          <button key={t} onClick={() => setFilter(t)} className={`px-3 py-2 text-xs font-semibold capitalize transition-colors ${filter === t ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`} data-testid={`filter-${t}`}>
            {t === "all" ? `All (${alerts.length})` : `${TYPE_LABELS[t] || t} (${alerts.filter((a) => a.type === t).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-xl" data-testid="alerts-empty">
          <AlertTriangle className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-500">{filter === "all" ? "No alerts this week" : `No ${TYPE_LABELS[filter] || filter} alerts`}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="alerts-table">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-center px-3 py-3 font-semibold text-slate-600 text-xs uppercase w-12">Sev</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 text-xs uppercase">Type</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 text-xs uppercase">Reference</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Message</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 text-xs uppercase">Owner / Rep</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 text-xs uppercase">Date</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((alert, i) => {
                  const Icon = ALERT_ICONS[alert.type] || AlertTriangle;
                  const cta = CTA_CONFIG[alert.type];
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`alert-row-${i}`}>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex w-6 h-6 rounded-full items-center justify-center ${
                          alert.severity === "critical" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                        }`}>
                          <Icon className="w-3 h-3" />
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Badge className={`text-[10px] ${SEVERITY_STYLES[alert.severity] || "bg-slate-100 text-slate-600"}`}>
                          {TYPE_LABELS[alert.type] || alert.type}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-xs text-[#20364D] font-medium truncate max-w-[140px]">
                        {alert.reference || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-xs">{alert.message}</td>
                      <td className="px-3 py-3 text-slate-600 text-xs truncate max-w-[140px]">{alert.entity || "Unassigned"}</td>
                      <td className="px-3 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {alert.date ? new Date(alert.date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {cta && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-[#20364D] hover:bg-slate-100"
                            onClick={() => navigate(cta.path)}
                            data-testid={`alert-cta-${i}`}
                          >
                            {cta.label} <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 text-xs text-slate-400 border-t border-slate-100">
            {filtered.length} alert{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
