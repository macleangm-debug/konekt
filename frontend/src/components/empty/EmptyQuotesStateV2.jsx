import React from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

export default function EmptyQuotesStateV2() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white py-16 px-6 text-center" data-testid="empty-quotes-state">
      <div className="w-12 h-12 mx-auto rounded-xl bg-[#f8fafc] mb-4 flex items-center justify-center">
        <FileText className="w-6 h-6 text-[#94a3b8]" />
      </div>
      <h3 className="text-lg font-semibold text-[#0f172a]">No quotes yet</h3>
      <p className="text-sm text-[#64748b] mt-2">Your next request could become your next approved quote.</p>
      <Link
        to="/account/marketplace?tab=services"
        className="inline-block mt-5 bg-[#0f172a] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1e293b] transition-colors"
        data-testid="empty-quotes-cta"
      >
        Request a Service
      </Link>
    </div>
  );
}
