import React from "react";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString()}`;
}

const statusStyles = {
  paid: "bg-emerald-100 text-emerald-800",
  pending_payout: "bg-amber-100 text-amber-800",
  expected: "bg-blue-100 text-blue-800",
  pending: "bg-slate-100 text-slate-700",
};

const statusLabels = {
  paid: "Paid",
  pending_payout: "Pending Payout",
  expected: "Expected",
  pending: "Pending",
};

export default function SalesCommissionTable({ rows = [] }) {
  if (!rows.length) {
    return (
      <div className="text-center py-10 text-slate-500" data-testid="sales-commission-table-empty">
        No commission data yet. Orders assigned to you will appear here.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border" data-testid="sales-commission-table">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-4 py-3 font-medium text-slate-600">Order</th>
            <th className="px-4 py-3 font-medium text-slate-600">Customer</th>
            <th className="px-4 py-3 font-medium text-slate-600">Order Total</th>
            <th className="px-4 py-3 font-medium text-slate-600">Your Commission</th>
            <th className="px-4 py-3 font-medium text-slate-600">Commission Status</th>
            <th className="px-4 py-3 font-medium text-slate-600">Order Status</th>
            <th className="px-4 py-3 font-medium text-slate-600">Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.order_id || i} className="border-t hover:bg-slate-50/50 transition">
              <td className="px-4 py-3 font-medium text-slate-900">{row.order_number}</td>
              <td className="px-4 py-3 text-slate-700">{row.customer_name}</td>
              <td className="px-4 py-3 text-slate-700">{money(row.order_total)}</td>
              <td className="px-4 py-3">
                <span className="font-semibold text-emerald-700">{money(row.commission_amount)}</span>
                <span className="text-xs text-slate-500 ml-1">({row.commission_pct}%)</span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusStyles[row.commission_status] || statusStyles.pending}`}>
                  {statusLabels[row.commission_status] || row.commission_status}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600 capitalize">{(row.order_status || "").replace(/_/g, " ")}</td>
              <td className="px-4 py-3 text-slate-500 text-xs">
                {row.created_at ? new Date(row.created_at).toLocaleDateString() : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
