import React from "react";

export default function BrandBadge({ children, tone = "default" }) {
  const tones = {
    default: "bg-[#f8fafc] text-[#64748b]",
    gold: "bg-amber-50 text-amber-700",
    dark: "bg-[#1f3a5f]/10 text-[#1f3a5f]",
    success: "bg-emerald-50 text-emerald-700",
  };

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
