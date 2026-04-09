import React from "react";

export default function MetricCard({ label, value, hint, icon: Icon, trend, className = "" }) {
  return (
    <div className={`rounded-3xl border bg-white p-5 k-card-interactive ${className}`} data-testid="metric-card">
      <div className="flex items-start justify-between">
        <div className="text-sm text-slate-500">{label}</div>
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-[#20364D]/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-[#20364D]" />
          </div>
        )}
      </div>
      <div className="text-2xl md:text-3xl font-bold mt-2 text-[#20364D]">
        {value}
      </div>
      {hint && <div className="text-sm text-slate-500 mt-2">{hint}</div>}
      {trend && (
        <div className={`text-sm mt-2 font-medium ${trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-slate-500"}`}>
          {trend > 0 ? "+" : ""}{trend}% from last month
        </div>
      )}
    </div>
  );
}
