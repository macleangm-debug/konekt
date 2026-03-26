import React, { useState } from "react";
import StatusBadge from "../shared/StatusBadge";
import { User, FileText, Receipt, ShoppingCart, MessageSquare } from "lucide-react";

const fmtDate = (d) => {
  if (!d) return "-";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
};

const TABS = [
  { key: "overview", label: "Overview", icon: User },
  { key: "quotes", label: "Quotes", icon: FileText },
  { key: "invoices", label: "Invoices", icon: Receipt },
  { key: "orders", label: "Orders", icon: ShoppingCart },
  { key: "notes", label: "Notes", icon: MessageSquare },
];

function KpiCard({ label, value, accent }) {
  const colors = {
    blue: "border-blue-200 bg-blue-50/60",
    amber: "border-amber-200 bg-amber-50/60",
    emerald: "border-emerald-200 bg-emerald-50/60",
    red: "border-red-200 bg-red-50/60",
    slate: "border-slate-200 bg-slate-50/60",
    violet: "border-violet-200 bg-violet-50/60",
  };
  return (
    <div className={`rounded-xl border p-3.5 ${colors[accent] || colors.slate}`}>
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-extrabold text-[#20364D]">{value ?? 0}</div>
    </div>
  );
}

function TransactionTable({ items, columns }) {
  if (!items || items.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">No records yet.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left">
          {columns.map((col) => (
            <th key={col.key} className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 ${col.align === "right" ? "text-right" : ""}`}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {items.map((item, idx) => (
          <tr key={item.id || idx} className="hover:bg-slate-50/50">
            {columns.map((col) => (
              <td key={col.key} className={`px-4 py-3 ${col.align === "right" ? "text-right" : ""}`}>
                {col.render ? col.render(item) : item[col.key] || "-"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OverviewTab({ c }) {
  return (
    <div className="space-y-5">
      {/* KPI Grid */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        <KpiCard label="Total Quotes" value={c.summary?.total_quotes} accent="blue" />
        <KpiCard label="Active Quotes" value={c.summary?.active_quotes} accent="blue" />
        <KpiCard label="Total Invoices" value={c.summary?.total_invoices} accent="emerald" />
        <KpiCard label="Unpaid" value={c.summary?.unpaid_invoices} accent="red" />
        <KpiCard label="Total Orders" value={c.summary?.total_orders} accent="violet" />
        <KpiCard label="Active Orders" value={c.summary?.active_orders} accent="amber" />
      </div>

      {/* Profile + Sales in 2 columns */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Profile</h3>
          <dl className="mt-4 space-y-2.5 text-sm">
            {[
              ["Customer Name", c.name],
              ["Company", c.company],
              ["Type", c.type],
              ["Email", c.email],
              ["Phone", c.phone],
              ["Address", c.address],
              ["Joined", fmtDate(c.created_at)],
              ["Referral Code", c.referral_code],
              ["Points", c.points],
              ["Credit Balance", c.credit_balance],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-slate-400 whitespace-nowrap">{label}</dt>
                <dd className="text-right font-medium text-[#20364D] truncate max-w-[200px]">{val || "-"}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Sales Ownership</h3>
          <dl className="mt-4 space-y-2.5 text-sm">
            {[
              ["Assigned Sales", c.assigned_sales?.name],
              ["Sales Phone", c.assigned_sales?.phone],
              ["Sales Email", c.assigned_sales?.email],
              ["Last Activity", fmtDate(c.last_activity_at)],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-slate-400 whitespace-nowrap">{label}</dt>
                <dd className="text-right font-medium text-[#20364D]">{val || "-"}</dd>
              </div>
            ))}
          </dl>

          <h3 className="mt-6 text-xs font-bold uppercase tracking-widest text-slate-400">Referrals</h3>
          <dl className="mt-3 space-y-2.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Referral Code</dt>
              <dd className="font-medium text-[#20364D]">{c.referral_code || "-"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Total Referrals</dt>
              <dd className="font-medium text-[#20364D]">{c.total_referrals ?? 0}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}

function QuotesTab({ quotes }) {
  return (
    <TransactionTable
      items={quotes}
      columns={[
        { key: "date", label: "Date", render: (q) => <span className="text-slate-500">{fmtDate(q.date)}</span> },
        { key: "quote_no", label: "Quote #", render: (q) => <span className="font-semibold text-[#20364D]">{q.quote_no}</span> },
        { key: "amount", label: "Amount", align: "right", render: (q) => <span className="font-semibold">{q.amount}</span> },
        { key: "status", label: "Status", render: (q) => <StatusBadge status={q.status} /> },
      ]}
    />
  );
}

function InvoicesTab({ invoices }) {
  return (
    <TransactionTable
      items={invoices}
      columns={[
        { key: "date", label: "Date", render: (i) => <span className="text-slate-500">{fmtDate(i.date)}</span> },
        { key: "invoice_no", label: "Invoice #", render: (i) => <span className="font-semibold text-[#20364D]">{i.invoice_no}</span> },
        { key: "amount", label: "Amount", align: "right", render: (i) => <span className="font-semibold">{i.amount}</span> },
        { key: "payment_status", label: "Payment", render: (i) => <StatusBadge status={i.payment_status} /> },
      ]}
    />
  );
}

function OrdersTab({ orders }) {
  return (
    <TransactionTable
      items={orders}
      columns={[
        { key: "date", label: "Date", render: (o) => <span className="text-slate-500">{fmtDate(o.date)}</span> },
        { key: "order_no", label: "Order #", render: (o) => <span className="font-semibold text-[#20364D]">{o.order_no}</span> },
        { key: "amount", label: "Amount", align: "right", render: (o) => <span className="font-semibold">{o.amount}</span> },
        { key: "fulfillment_state", label: "Fulfillment", render: (o) => <StatusBadge status={o.fulfillment_state} /> },
      ]}
    />
  );
}

function NotesTab({ notes }) {
  return (
    <div className="p-1">
      {notes ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm text-slate-700 whitespace-pre-wrap">{notes}</div>
      ) : (
        <p className="py-8 text-center text-sm text-slate-400">No internal notes yet.</p>
      )}
    </div>
  );
}

export default function CustomerDrawer360({ customer }) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!customer) return null;

  const statusColor = {
    active: "bg-emerald-100 text-emerald-800",
    at_risk: "bg-amber-100 text-amber-800",
    inactive: "bg-slate-200 text-slate-600",
  };

  return (
    <div className="flex flex-col h-full" data-testid="customer-drawer-360">
      {/* Sticky Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Customer 360</p>
            <h2 className="mt-1 text-2xl font-extrabold text-[#20364D]">{customer.name}</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {customer.email}
              {customer.company && customer.company !== "-" && <span className="ml-2 text-slate-400">| {customer.company}</span>}
            </p>
          </div>
          <span className={`mt-1 inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusColor[customer.status] || statusColor.inactive}`}>
            {(customer.status || "inactive").replace("_", " ")}
          </span>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 overflow-x-auto" data-testid="customer-drawer-tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                data-testid={`customer-tab-${tab.key}`}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#20364D] text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "overview" && <OverviewTab c={customer} />}
        {activeTab === "quotes" && <QuotesTab quotes={customer.recent_quotes || []} />}
        {activeTab === "invoices" && <InvoicesTab invoices={customer.recent_invoices || []} />}
        {activeTab === "orders" && <OrdersTab orders={customer.recent_orders || []} />}
        {activeTab === "notes" && <NotesTab notes={customer.notes} />}
      </div>
    </div>
  );
}
