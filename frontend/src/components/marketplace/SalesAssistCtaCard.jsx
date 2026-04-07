import React from "react";
import { MessageSquare } from "lucide-react";

export default function SalesAssistCtaCard({
  title = "Need help with your order?",
  body = "Our sales team can help you with quantities, branding options, service requests, and custom quotes.",
  buttonLabel = "Talk to Sales",
  onClick,
  compact = false,
}) {
  return (
    <div
      className={`rounded-2xl border border-amber-200 bg-amber-50 ${compact ? "p-4" : "p-5"}`}
      data-testid="sales-assist-cta-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={`font-semibold text-[#20364D] ${compact ? "text-sm" : "text-base"}`}>{title}</h3>
          <p className={`mt-1.5 text-slate-600 ${compact ? "text-xs" : "text-sm"}`}>{body}</p>
        </div>
        <span className="rounded-full bg-amber-100 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-800 whitespace-nowrap flex-shrink-0">
          Sales Assist
        </span>
      </div>
      <div className="mt-3">
        <button
          type="button"
          className={`rounded-xl bg-[#20364D] text-white font-semibold hover:bg-[#17283c] transition flex items-center justify-center gap-2 w-full md:w-auto ${
            compact ? "px-4 py-2.5 text-sm" : "px-5 py-3 text-sm"
          }`}
          onClick={onClick}
          data-testid="sales-assist-cta-btn"
        >
          <MessageSquare className="w-4 h-4" />
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
