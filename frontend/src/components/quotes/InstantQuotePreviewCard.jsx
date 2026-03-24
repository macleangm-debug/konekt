import React from "react";
import { TrendingUp, Shield, Percent, DollarSign } from "lucide-react";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString()}`;
}

export default function InstantQuotePreviewCard({ data }) {
  if (!data?.estimate) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-[#f8fafc] p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
        <TrendingUp className="w-10 h-10 text-[#94a3b8] mb-3" />
        <div className="text-sm font-medium text-[#64748b]">Enter a base amount to preview</div>
        <div className="text-xs text-[#94a3b8] mt-1">Your instant quote will appear here</div>
      </div>
    );
  }

  const e = data.estimate;

  const cards = [
    { label: "Base Amount", value: e.base_amount, icon: DollarSign, color: "text-blue-600 bg-blue-50" },
    { label: "Company Margin", value: e.company_margin_amount, icon: Shield, color: "text-purple-600 bg-purple-50" },
    { label: "Distribution Buffer", value: e.distribution_buffer_amount, icon: Percent, color: "text-amber-600 bg-amber-50" },
    { label: "VAT", value: e.vat_amount, icon: Percent, color: "text-green-600 bg-green-50" },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6" data-testid="instant-quote-preview">
      <h3 className="text-lg font-semibold text-[#0f172a]">Quote Estimate</h3>
      <p className="text-sm text-[#64748b] mt-1">Respects your protected margin and distribution rules.</p>

      <div className="grid md:grid-cols-2 gap-3 mt-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl bg-[#f8fafc] border border-gray-100 p-4">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs text-[#64748b]">{card.label}</span>
              </div>
              <div className="text-lg font-semibold text-[#0f172a] mt-2">{money(card.value)}</div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl bg-gradient-to-r from-[#1f3a5f] to-[#162c47] text-white p-5 mt-5">
        <div className="text-sm text-white/60">Estimated Total</div>
        <div className="text-2xl font-semibold mt-1">{money(e.total_amount)}</div>
      </div>

      {data.rules && (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-xs bg-[#f8fafc] border border-gray-100 rounded-md px-2 py-1 text-[#64748b]">
            Margin: {data.rules.minimum_company_margin_percent}%
          </span>
          <span className="text-xs bg-[#f8fafc] border border-gray-100 rounded-md px-2 py-1 text-[#64748b]">
            Buffer: {data.rules.distribution_buffer_percent}%
          </span>
          <span className="text-xs bg-[#f8fafc] border border-gray-100 rounded-md px-2 py-1 text-[#64748b]">
            VAT: {data.rules.vat_percent}%
          </span>
        </div>
      )}
    </div>
  );
}
