import React from "react";

const ZONE_STYLES = {
  excellent: { bg: "bg-emerald-100", text: "text-emerald-700", ring: "ring-emerald-400", label: "Excellent" },
  safe: { bg: "bg-blue-100", text: "text-blue-700", ring: "ring-blue-400", label: "Safe" },
  risk: { bg: "bg-red-100", text: "text-red-700", ring: "ring-red-400", label: "Risk" },
  developing: { bg: "bg-slate-100", text: "text-slate-500", ring: "ring-slate-300", label: "Developing" },
};

export default function PerformanceCell({ score, zone, onClick }) {
  const z = ZONE_STYLES[zone] || ZONE_STYLES.developing;
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-sm font-semibold transition-all hover:ring-2 hover:ring-offset-1 ${z.bg} ${z.text} ${z.ring}`}
      data-testid="performance-cell"
    >
      <span className="text-base font-extrabold">{score ?? "—"}%</span>
      <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">{z.label}</span>
    </button>
  );
}
