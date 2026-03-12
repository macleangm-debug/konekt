import React from "react";
import { formatMoney } from "@/utils/finance";
import { Calculator } from "lucide-react";

export default function TaxSummaryCard({
  currency = "TZS",
  taxName = "VAT",
  subtotal = 0,
  discount = 0,
  tax = 0,
  total = 0,
}) {
  return (
    <div className="rounded-2xl border bg-white p-5" data-testid="tax-summary-card">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-[#2D3E50]" />
        <span className="font-semibold">Totals</span>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Subtotal</span>
          <span className="font-medium">{formatMoney(subtotal, currency)}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-{formatMoney(discount, currency)}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-slate-500">{taxName}</span>
          <span className="font-medium">{formatMoney(tax, currency)}</span>
        </div>

        <div className="flex justify-between font-bold text-lg pt-3 border-t border-slate-200">
          <span className="text-[#2D3E50]">Total</span>
          <span className="text-[#2D3E50]">{formatMoney(total, currency)}</span>
        </div>
      </div>
    </div>
  );
}
