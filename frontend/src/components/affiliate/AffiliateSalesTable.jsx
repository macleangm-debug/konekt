import React from "react";

export default function AffiliateSalesTable({ rows = [] }) {
  return (
    <div className="rounded-[2rem] border bg-white p-8">
      <div className="text-2xl font-bold text-[#20364D]">Sales History</div>

      <div className="space-y-4 mt-6">
        {rows.map((row) => (
          <div key={row.id} className="rounded-2xl border bg-slate-50 p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="font-semibold text-[#20364D]">{row.item_name}</div>
                <div className="text-sm text-slate-500 mt-1">{row.date} • {row.customer_masked}</div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <span className="rounded-full px-3 py-1 text-xs font-semibold bg-white border">
                  Order Value {row.order_value}
                </span>
                <span className="rounded-full px-3 py-1 text-xs font-semibold bg-white border">
                  Commission {row.commission}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {row.status}
                </span>
              </div>
            </div>
          </div>
        ))}

        {!rows.length ? (
          <div className="rounded-2xl border bg-slate-50 p-6 text-slate-600">
            No sales yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
