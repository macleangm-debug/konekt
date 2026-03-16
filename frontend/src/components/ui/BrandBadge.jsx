import React from "react";

export default function BrandBadge({ children, tone = "default" }) {
  const tones = {
    default: "bg-slate-100 text-slate-700",
    gold: "bg-[#D4A843]/15 text-[#8B6A10]",
    dark: "bg-[#20364D]/10 text-[#20364D]",
    success: "bg-emerald-50 text-emerald-700",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}
