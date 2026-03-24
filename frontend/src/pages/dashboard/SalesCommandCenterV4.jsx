import React, { useState } from "react";
import { Zap, RefreshCcw, Calculator } from "lucide-react";
import SalesDispatchQueueBoard from "../../components/sales/SalesDispatchQueueBoard";
import InstantQuoteBuilderPanel from "../../components/quotes/InstantQuoteBuilderPanel";

export default function SalesCommandCenterV4({ salesOwnerId = "" }) {
  const [selectedLead, setSelectedLead] = useState(null);

  return (
    <div className="space-y-6" data-testid="sales-command-center">
      {/* Hero */}
      <div className="rounded-xl bg-gradient-to-r from-[#1f3a5f] to-[#162c47] text-white p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-[#f4c430]" />
              <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Sales Command Center</h2>
            </div>
            <p className="text-white/60 text-sm">
              Claim leads, build quotes, close deals — all in one place.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-white/10 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
            data-testid="refresh-dispatch-btn"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Dispatch Board */}
      <SalesDispatchQueueBoard salesOwnerId={salesOwnerId} onSelectLead={setSelectedLead} />

      {/* Quote Builder (Sales Internal Tool) */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-[#1f3a5f]/10 flex items-center justify-center">
            <Calculator className="w-4 h-4 text-[#1f3a5f]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#0f172a]">Instant Quote Builder</h3>
            <p className="text-xs text-[#64748b]">
              {selectedLead
                ? `Building quote for ${selectedLead.name || selectedLead.customer_name || "selected lead"}`
                : "Select a lead above or enter a base amount to preview pricing"}
            </p>
          </div>
          {selectedLead && (
            <button
              onClick={() => setSelectedLead(null)}
              className="ml-auto text-xs text-[#94a3b8] hover:text-[#64748b] transition-colors"
            >
              Clear selection
            </button>
          )}
        </div>
        <InstantQuoteBuilderPanel lead={selectedLead} />
      </div>
    </div>
  );
}
