import React from "react";
import { Link } from "react-router-dom";
import { Receipt } from "lucide-react";

export default function EmptyInvoicesStateV2() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white py-16 px-6 text-center" data-testid="empty-invoices-state">
      <div className="w-12 h-12 mx-auto rounded-xl bg-[#f8fafc] mb-4 flex items-center justify-center">
        <Receipt className="w-6 h-6 text-[#94a3b8]" />
      </div>
      <h3 className="text-lg font-semibold text-[#0f172a]">No invoices yet</h3>
      <p className="text-sm text-[#64748b] mt-2">Approved quotes automatically become invoices ready for payment.</p>
      <Link
        to="/account/quotes"
        className="inline-block mt-5 border border-gray-200 text-[#0f172a] px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#f8fafc] transition-colors"
        data-testid="empty-invoices-cta"
      >
        View Quotes
      </Link>
    </div>
  );
}
