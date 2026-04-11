import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { AlertTriangle, Clock, ShieldAlert, Users } from "lucide-react";
import safeDisplay from "@/utils/safeDisplay";

export default function TeamAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Pull CRM leads to find overdue follow-ups and stale deals
        const res = await api.get("/api/admin/crm/leads");
        const leads = res.data?.leads || res.data || [];
        const now = new Date();
        const generated = [];

        for (const l of (Array.isArray(leads) ? leads : [])) {
          // Overdue follow-ups
          if (l.next_follow_up_at && new Date(l.next_follow_up_at) < now) {
            generated.push({
              id: `overdue-${l.id}`,
              type: "overdue_followup",
              severity: "high",
              title: `Overdue follow-up: ${l.contact_name || l.name || "Unknown"}`,
              description: `Follow-up was due ${new Date(l.next_follow_up_at).toLocaleDateString()}`,
              lead: l,
            });
          }
          // Stale leads (no update in 14+ days)
          if (l.updated_at) {
            const daysSince = (now - new Date(l.updated_at)) / (1000 * 60 * 60 * 24);
            if (daysSince > 14 && l.stage !== "won" && l.stage !== "lost") {
              generated.push({
                id: `stale-${l.id}`,
                type: "stale_lead",
                severity: "medium",
                title: `Stale lead: ${l.contact_name || l.name || "Unknown"}`,
                description: `No activity for ${Math.floor(daysSince)} days — stage: ${l.stage || "unknown"}`,
                lead: l,
              });
            }
          }
        }

        generated.sort((a, b) => (a.severity === "high" ? -1 : 1));
        setAlerts(generated);
      } catch { setAlerts([]); }
      setLoading(false);
    })();
  }, []);

  const severityStyles = {
    high: { bg: "bg-red-50", border: "border-red-200", icon: "text-red-500", badge: "bg-red-100 text-red-700" },
    medium: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-500", badge: "bg-amber-100 text-amber-700" },
    low: { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-500", badge: "bg-blue-100 text-blue-700" },
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6" data-testid="team-alerts-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#20364D]">Alerts</h1>
          <p className="text-sm text-slate-500 mt-0.5">System-generated alerts for stale deals and overdue tasks</p>
        </div>
        <span className="text-xs font-semibold text-slate-400">{alerts.length} alert{alerts.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Scanning for alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-xl" data-testid="alerts-empty">
          <ShieldAlert className="w-12 h-12 mx-auto text-emerald-200 mb-3" />
          <p className="text-sm font-semibold text-emerald-600">All clear</p>
          <p className="text-xs text-slate-400 mt-1">No overdue follow-ups or stale leads detected</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="alerts-list">
          {alerts.map((a) => {
            const s = severityStyles[a.severity] || severityStyles.low;
            return (
              <div key={a.id} className={`rounded-xl border ${s.border} ${s.bg} p-4 flex items-start gap-3`} data-testid={`alert-${a.id}`}>
                {a.type === "overdue_followup" ? (
                  <Clock className={`w-5 h-5 mt-0.5 shrink-0 ${s.icon}`} />
                ) : (
                  <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${s.icon}`} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-700">{a.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{a.description}</div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${s.badge}`}>
                  {a.severity.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
