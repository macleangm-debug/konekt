import React from "react";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString()}`;
}

export default function MonthlyBreakdownTable({ months = [] }) {
  if (!months.length) {
    return (
      <div className="text-center py-8 text-slate-500" data-testid="monthly-breakdown-empty">
        No monthly data yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border" data-testid="monthly-breakdown-table">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-4 py-3 font-medium text-slate-600">Month</th>
            <th className="px-4 py-3 font-medium text-slate-600">Earned</th>
            <th className="px-4 py-3 font-medium text-slate-600">Pending</th>
            <th className="px-4 py-3 font-medium text-slate-600">Paid</th>
            <th className="px-4 py-3 font-medium text-slate-600">Deals</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m, i) => (
            <tr key={m.month || i} className="border-t hover:bg-slate-50/50 transition">
              <td className="px-4 py-3 font-medium text-slate-900">{m.month}</td>
              <td className="px-4 py-3 font-semibold text-emerald-700">{money(m.earned)}</td>
              <td className="px-4 py-3 text-amber-700">{money(m.pending)}</td>
              <td className="px-4 py-3 text-slate-700">{money(m.paid)}</td>
              <td className="px-4 py-3 text-slate-600">{m.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
