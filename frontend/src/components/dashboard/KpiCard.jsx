import React from "react";

export default function KpiCard({ label, value, helper, accent = "slate" }) {
  const accentMap = {
    slate: "border-slate-200 bg-white",
    emerald: "border-emerald-200 bg-emerald-50",
    amber: "border-amber-200 bg-amber-50",
    blue: "border-blue-200 bg-blue-50",
  };

  return (
    <div className={`rounded-2xl border p-5 ${accentMap[accent] || accentMap.slate}`} data-testid={`kpi-card-${label?.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      {helper ? <div className="mt-2 text-sm text-slate-600">{helper}</div> : null}
    </div>
  );
}
