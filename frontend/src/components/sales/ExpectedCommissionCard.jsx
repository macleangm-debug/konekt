import React from "react";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString()}`;
}

export default function ExpectedCommissionCard({ quoteNumber, finalPrice, expectedCommission, salesPct }) {
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5" data-testid="expected-commission-card">
      <div className="text-xs uppercase tracking-[0.2em] text-blue-700">Expected Commission</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{quoteNumber}</div>
      <div className="mt-3 text-sm text-slate-700">Final Quote: {money(finalPrice)}</div>
      <div className="mt-1 text-xl font-bold text-emerald-700">
        {money(expectedCommission)} <span className="text-sm font-medium text-slate-600">({salesPct}%)</span>
      </div>
      <p className="mt-2 text-sm text-slate-600">This is your expected commission if the quote closes successfully.</p>
    </div>
  );
}
