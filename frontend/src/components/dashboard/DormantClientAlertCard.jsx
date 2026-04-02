import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";

export default function DormantClientAlertCard() {
  const [summary, setSummary] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/api/admin/dormant-clients/summary")
      .then((res) => setSummary(res.data?.summary || null))
      .catch(() => {});
  }, []);

  if (!summary) return null;
  const dormantTotal = (summary.at_risk || 0) + (summary.inactive || 0) + (summary.lost || 0);
  if (dormantTotal === 0) return null;

  return (
    <div
      data-testid="dormant-client-alert-card"
      className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate("/admin/dormant-clients")}
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-semibold text-amber-800">Dormant Client Alerts</h3>
        <span className="ml-auto text-xs text-amber-600 font-medium">{dormantTotal} total</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-white/80 border border-amber-100 p-2.5 text-center">
          <div className="text-[11px] text-amber-600 font-medium">At Risk</div>
          <div className="text-lg font-bold text-amber-700">{summary.at_risk || 0}</div>
        </div>
        <div className="rounded-lg bg-white/80 border border-orange-100 p-2.5 text-center">
          <div className="text-[11px] text-orange-600 font-medium">Inactive</div>
          <div className="text-lg font-bold text-orange-700">{summary.inactive || 0}</div>
        </div>
        <div className="rounded-lg bg-white/80 border border-red-100 p-2.5 text-center">
          <div className="text-[11px] text-red-600 font-medium">Lost</div>
          <div className="text-lg font-bold text-red-700">{summary.lost || 0}</div>
        </div>
      </div>
    </div>
  );
}
