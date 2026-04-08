import React from "react";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString()}`;
}

const statusStyles = {
  paid: "bg-emerald-100 text-emerald-800",
  pending_payout: "bg-amber-100 text-amber-800",
  approved: "bg-amber-100 text-amber-800",
  pending: "bg-slate-100 text-slate-700",
  expected: "bg-blue-100 text-blue-800",
};

const statusLabels = {
  paid: "Paid",
  pending_payout: "Pending Payout",
  approved: "Pending Payout",
  pending: "Pending",
  expected: "Expected",
};

export default function AffiliateEarningsTable({ rows = [] }) {
  if (!rows.length) {
    return (
      <div className="text-center py-10 text-slate-500" data-testid="affiliate-earnings-table-empty">
        No earnings yet. Start sharing products to earn commissions!
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border" data-testid="affiliate-earnings-table">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-4 py-3 font-medium text-slate-600">Order</th>
            <th className="px-4 py-3 font-medium text-slate-600">Customer</th>
            <th className="px-4 py-3 font-medium text-slate-600">Commission</th>
            <th className="px-4 py-3 font-medium text-slate-600">Status</th>
            <th className="px-4 py-3 font-medium text-slate-600">Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || i} className="border-t hover:bg-slate-50/50 transition">
              <td className="px-4 py-3 font-medium text-slate-900">{row.order_number}</td>
              <td className="px-4 py-3 text-slate-700">{row.client_name || "—"}</td>
              <td className="px-4 py-3 font-semibold text-emerald-700">{money(row.affiliate_amount)}</td>
              <td className="px-4 py-3">
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusStyles[row.status] || statusStyles.pending}`}>
                  {statusLabels[row.status] || row.status}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-500 text-xs">{row.date_label || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
