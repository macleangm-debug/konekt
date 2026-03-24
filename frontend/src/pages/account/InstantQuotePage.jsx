import React from "react";
import InstantQuoteBuilderPanel from "../../components/quotes/InstantQuoteBuilderPanel";

export default function InstantQuotePage() {
  return (
    <div className="space-y-6" data-testid="instant-quote-page">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#0f172a] tracking-tight">Instant Quote Engine</h1>
        <p className="text-sm text-[#64748b] mt-1">Preview safe pricing in real time before sales finalizes the quote.</p>
      </div>
      <InstantQuoteBuilderPanel />
    </div>
  );
}
