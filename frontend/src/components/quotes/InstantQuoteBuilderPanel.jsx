import React, { useState } from "react";
import { Calculator, Loader2 } from "lucide-react";
import useInstantQuotePreview from "../../hooks/useInstantQuotePreview";
import InstantQuotePreviewCard from "./InstantQuotePreviewCard";

export default function InstantQuoteBuilderPanel() {
  const [baseAmount, setBaseAmount] = useState("");
  const { data, loading, preview } = useInstantQuotePreview();

  const handlePreview = async () => {
    if (!baseAmount || Number(baseAmount) <= 0) return;
    await preview({ base_amount: Number(baseAmount) });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handlePreview();
  };

  return (
    <div className="grid xl:grid-cols-[400px_1fr] gap-6" data-testid="instant-quote-builder">
      {/* Input Panel */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-[#1f3a5f]/10 flex items-center justify-center">
            <Calculator className="w-4 h-4 text-[#1f3a5f]" />
          </div>
          <h3 className="text-lg font-semibold text-[#0f172a]">Quote Builder</h3>
        </div>
        <p className="text-sm text-[#64748b] mt-2">
          Preview a margin-safe estimate before sales finalizes the quote.
        </p>

        <div className="mt-6">
          <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Base Amount (TZS)</label>
          <input
            type="number"
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-[#1f3a5f] focus:border-transparent outline-none transition"
            placeholder="e.g. 500,000"
            value={baseAmount}
            onChange={(e) => setBaseAmount(e.target.value)}
            onKeyDown={handleKeyDown}
            data-testid="quote-base-amount"
          />
        </div>

        <button
          onClick={handlePreview}
          disabled={loading || !baseAmount}
          className="w-full mt-4 bg-[#0f172a] text-white py-3 rounded-lg text-sm font-semibold hover:bg-[#1e293b] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-md"
          data-testid="quote-preview-btn"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Calculating...
            </span>
          ) : (
            "Preview Instant Quote"
          )}
        </button>

        <p className="text-xs text-[#94a3b8] mt-3 text-center">
          Pricing includes margin, distribution buffer, and VAT
        </p>
      </div>

      {/* Preview Card */}
      <InstantQuotePreviewCard data={data} />
    </div>
  );
}
