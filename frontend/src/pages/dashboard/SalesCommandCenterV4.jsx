import React from "react";
import { Zap, RefreshCcw } from "lucide-react";
import SalesDispatchQueueBoard from "../../components/sales/SalesDispatchQueueBoard";

export default function SalesCommandCenterV4({ salesOwnerId = "" }) {
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
              See the next best action instantly. Claim leads, follow up, close deals.
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
      <SalesDispatchQueueBoard salesOwnerId={salesOwnerId} />
    </div>
  );
}
