import React from "react";
import { Box } from "lucide-react";

export default function AudienceUseCaseCard({
  Icon = Box,
  title,
  description,
  highlight = false,
}) {
  return (
    <div
      className={`rounded-[2rem] border p-6 transition ${
        highlight
          ? "bg-gradient-to-br from-[#20364D] to-[#17283C] text-white border-[#20364D] shadow-lg"
          : "bg-white text-slate-900 hover:shadow-md"
      }`}
      data-testid={`audience-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div
        className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
          highlight ? "bg-white/10 text-white" : "bg-slate-100 text-[#20364D]"
        }`}
      >
        <Icon className="w-7 h-7" />
      </div>

      <div className={`text-2xl font-bold mt-5 ${highlight ? "text-white" : "text-[#20364D]"}`}>
        {title}
      </div>

      <p className={`mt-3 leading-7 ${highlight ? "text-slate-200" : "text-slate-600"}`}>
        {description}
      </p>
    </div>
  );
}
