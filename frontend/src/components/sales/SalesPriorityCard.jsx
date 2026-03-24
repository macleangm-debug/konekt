import React from "react";

export default function SalesPriorityCard({ title, count, tone = "default", children }) {
  const toneMap = {
    default: "bg-white border border-gray-200",
    red: "bg-red-50 border border-red-200",
    yellow: "bg-amber-50 border border-amber-200",
    green: "bg-emerald-50 border border-emerald-200",
    blue: "bg-blue-50 border border-blue-200",
  };

  const countColor = {
    default: "text-[#0f172a]",
    red: "text-red-700",
    yellow: "text-amber-700",
    green: "text-emerald-700",
    blue: "text-blue-700",
  };

  return (
    <div className={`rounded-xl p-5 ${toneMap[tone] || toneMap.default}`} data-testid={`priority-card-${tone}`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-[#0f172a]">{title}</h4>
        <span className={`text-xl font-semibold ${countColor[tone] || countColor.default}`}>
          {count || 0}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
      {(!children || (Array.isArray(children) && children.length === 0)) && (
        <div className="text-xs text-[#94a3b8] text-center py-4">No items</div>
      )}
    </div>
  );
}
