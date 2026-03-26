import React from "react";
import StatusBadge from "../shared/StatusBadge";

function SummaryCard({ title, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</div>
      <div className="mt-1.5 text-2xl font-bold text-[#20364D]">{value ?? 0}</div>
    </div>
  );
}

function TransactionList({ title, items, noLabel, renderItem }) {
  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">{noLabel}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
              {renderItem(item)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function CustomerDrawer360({ customer }) {
  if (!customer) return null;

  const fmtDate = (d) => {
    if (!d) return "-";
    try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return d; }
  };

  return (
    <div className="space-y-5 p-5" data-testid="customer-drawer-360">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Customer 360</div>
          <h2 className="mt-1 text-xl font-bold text-[#20364D]">{customer.name || "-"}</h2>
          <p className="text-sm text-slate-500">{customer.email || "-"}</p>
          {customer.company && customer.company !== "-" && (
            <p className="text-sm text-slate-500">{customer.company}</p>
          )}
        </div>
        <StatusBadge status={customer.status || "active"} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard title="Quotes" value={customer.summary?.total_quotes} />
        <SummaryCard title="Invoices" value={customer.summary?.total_invoices} />
        <SummaryCard title="Orders" value={customer.summary?.total_orders} />
        <SummaryCard title="Unpaid" value={customer.summary?.unpaid_invoices} />
      </div>

      {/* Profile + Sales */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Profile</div>
          <dl className="mt-3 grid gap-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Type</dt><dd className="font-medium text-slate-800">{customer.type || "-"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Phone</dt><dd className="font-medium text-slate-800">{customer.phone || "-"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Address</dt><dd className="font-medium text-slate-800">{customer.address || "-"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Referral Code</dt><dd className="font-medium text-slate-800">{customer.referral_code || "-"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Points</dt><dd className="font-medium text-slate-800">{customer.points ?? 0}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Credit Balance</dt><dd className="font-medium text-slate-800">{customer.credit_balance ?? 0}</dd></div>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sales Ownership</div>
          <dl className="mt-3 grid gap-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Assigned Sales</dt><dd className="font-medium text-slate-800">{customer.assigned_sales?.name || "-"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Phone</dt><dd className="font-medium text-slate-800">{customer.assigned_sales?.phone || "-"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd className="font-medium text-slate-800">{customer.assigned_sales?.email || "-"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Last Activity</dt><dd className="font-medium text-slate-800">{fmtDate(customer.last_activity_at)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Joined</dt><dd className="font-medium text-slate-800">{fmtDate(customer.created_at)}</dd></div>
          </dl>
        </section>
      </div>

      {/* Recent Transactions */}
      <div className="grid gap-4 md:grid-cols-3">
        <TransactionList
          title="Recent Quotes"
          items={customer.recent_quotes || []}
          noLabel="No quotes yet"
          renderItem={(q) => (
            <>
              <div>
                <div className="text-sm font-semibold text-[#20364D]">{q.quote_no}</div>
                <div className="text-xs text-slate-400">{fmtDate(q.date)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-slate-700">{q.amount}</div>
                <StatusBadge status={q.status} />
              </div>
            </>
          )}
        />
        <TransactionList
          title="Recent Invoices"
          items={customer.recent_invoices || []}
          noLabel="No invoices yet"
          renderItem={(i) => (
            <>
              <div>
                <div className="text-sm font-semibold text-[#20364D]">{i.invoice_no}</div>
                <div className="text-xs text-slate-400">{fmtDate(i.date)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-slate-700">{i.amount}</div>
                <StatusBadge status={i.payment_status} />
              </div>
            </>
          )}
        />
        <TransactionList
          title="Recent Orders"
          items={customer.recent_orders || []}
          noLabel="No orders yet"
          renderItem={(o) => (
            <>
              <div>
                <div className="text-sm font-semibold text-[#20364D]">{o.order_no}</div>
                <div className="text-xs text-slate-400">{fmtDate(o.date)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-slate-700">{o.amount}</div>
                <StatusBadge status={o.fulfillment_state} />
              </div>
            </>
          )}
        />
      </div>

      {/* Notes */}
      {customer.notes && (
        <section className="rounded-xl border border-slate-200 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Internal Notes</div>
          <p className="mt-2 text-sm text-slate-600">{customer.notes}</p>
        </section>
      )}
    </div>
  );
}
