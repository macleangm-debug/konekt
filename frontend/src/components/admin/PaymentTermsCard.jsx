import React from "react";
import { CreditCard, Clock, FileText } from "lucide-react";

export default function PaymentTermsCard({ customer }) {
  if (!customer) return null;

  return (
    <div className="rounded-2xl border border-[#D4A843]/30 bg-[#D4A843]/5 p-5 space-y-3" data-testid="payment-terms-card">
      <div className="flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-[#D4A843]" />
        <span className="font-semibold">Payment Terms</span>
      </div>
      
      <div className="flex items-center gap-2 text-base font-medium text-[#2D3E50]">
        <Clock className="w-4 h-4" />
        {customer.payment_term_label || "Due on Receipt"}
      </div>

      {customer.payment_term_notes && (
        <div className="flex items-start gap-2 text-sm text-slate-600">
          <FileText className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
          <span className="whitespace-pre-wrap">{customer.payment_term_notes}</span>
        </div>
      )}

      {customer.credit_limit > 0 && (
        <div className="pt-2 border-t border-[#D4A843]/20">
          <span className="text-sm text-slate-600">
            Credit Limit: <span className="font-semibold text-green-700">TZS {customer.credit_limit.toLocaleString()}</span>
          </span>
        </div>
      )}
    </div>
  );
}
