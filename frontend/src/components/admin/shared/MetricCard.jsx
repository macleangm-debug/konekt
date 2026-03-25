import React from "react";

export default function MetricCard({ label, value, icon: Icon, color = "text-[#20364D] bg-slate-50" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5" data-testid={`metric-${label?.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Icon size={18} /></div>
        )}
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-xl font-bold text-[#20364D] mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  );
}
