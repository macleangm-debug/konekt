import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import useInstantQuotePreview from "../../hooks/useInstantQuotePreview";
import InstantQuotePreviewCard from "./InstantQuotePreviewCard";

export default function InstantQuoteBuilderPanel({ lead = null }) {
  const [baseAmount, setBaseAmount] = useState("");
  const { data, loading, preview } = useInstantQuotePreview();

  // Auto-fill base amount from lead data
  useEffect(() => {
    if (lead) {
      const amount = lead.estimated_value || lead.subtotal || lead.total || "";
      if (amount && Number(amount) > 0) {
        setBaseAmount(String(amount));
      }
    }
  }, [lead]);

  const handlePreview = async () => {
    if (!baseAmount || Number(baseAmount) <= 0) return;
    await preview({ base_amount: Number(baseAmount) });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handlePreview();
  };

  return (
    <div className="grid xl:grid-cols-[1fr_1fr] gap-6" data-testid="instant-quote-builder">
      {/* Input Panel */}
      <div>
        {lead && (
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 mb-4">
            <div className="text-xs font-medium text-blue-700">Selected Lead</div>
            <div className="text-sm font-semibold text-[#0f172a] mt-0.5">
              {lead.name || lead.customer_name || "Unknown"}
            </div>
            <div className="text-xs text-[#64748b] mt-0.5">
              {lead.email || lead.customer_email || ""} {lead.phone || lead.customer_phone ? `• ${lead.phone || lead.customer_phone}` : ""}
            </div>
            {lead.company && <div className="text-xs text-[#94a3b8] mt-0.5">{lead.company}</div>}
          </div>
        )}

        <div>
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
          Includes margin, distribution buffer, and VAT
        </p>
      </div>

      {/* Preview Card */}
      <InstantQuotePreviewCard data={data} />
    </div>
  );
}
