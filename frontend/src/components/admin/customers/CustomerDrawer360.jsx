import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "@/lib/adminApi";
import StatusBadge from "../shared/StatusBadge";
import StatementOfAccountTab from "@/components/customers/StatementOfAccountTab";
import {
  User, FileText, Receipt, ShoppingCart, MessageSquare,
  ExternalLink, Inbox, CreditCard, BookOpen,
} from "lucide-react";

const fmtDate = (d) => {
  if (!d) return "-";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
};

const fmtMoney = (val) => {
  if (val === null || val === undefined) return "TZS 0";
  return `TZS ${Number(val).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
};

const TABS = [
  { key: "overview", label: "Overview", icon: User },
  { key: "requests", label: "Requests", icon: Inbox },
  { key: "orders", label: "Orders", icon: ShoppingCart },
  { key: "quotes", label: "Quotes", icon: FileText },
  { key: "invoices", label: "Invoices", icon: Receipt },
  { key: "payments", label: "Payments", icon: CreditCard },
  { key: "statement", label: "Statement", icon: BookOpen },
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
    teal: "border-teal-200 bg-teal-50/60",
    orange: "border-orange-200 bg-orange-50/60",
  };
  return (
    <div className={`rounded-xl border p-3 ${colors[accent] || colors.slate}`}>
      <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-0.5 text-lg font-extrabold text-[#20364D]">{value ?? 0}</div>
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
  const kpis = c.profile_kpis || {};
  const summary = c.summary || {};
  const isIndividual = (c.type || "").toLowerCase() === "individual" || (!c.company && !c.company_name);
  return (
    <div className="space-y-4">
      {/* Revenue KPIs */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        <KpiCard label="Revenue" value={fmtMoney(kpis.total_revenue)} accent="emerald" />
        <KpiCard label="Outstanding" value={fmtMoney(kpis.outstanding_balance)} accent="red" />
        <KpiCard label="Paid" value={fmtMoney(kpis.total_paid)} accent="teal" />
        <KpiCard label="Avg Order" value={fmtMoney(kpis.avg_order_value)} accent="blue" />
        <KpiCard label="Punctuality" value={`${kpis.payment_punctuality_pct || 0}%`} accent="amber" />
      </div>

      {/* Counts */}
      <div className="grid grid-cols-4 gap-2">
        <KpiCard label="Requests" value={summary.total_requests} accent="orange" />
        <KpiCard label="Orders" value={summary.total_orders} accent="violet" />
        <KpiCard label="Invoices" value={summary.total_invoices} accent="emerald" />
        <KpiCard label="Payments" value={summary.total_payments} accent="teal" />
      </div>

      {/* Profile + Sales */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Profile</h3>
          <dl className="mt-3 space-y-2 text-sm">
            {[
              !isIndividual && ["Company", c.company || c.company_name],
              ["Type", c.type ? (c.type.charAt(0).toUpperCase() + c.type.slice(1)) : "-"],
              ["Email", c.email],
              ["Phone", c.phone],
              ["Joined", fmtDate(c.created_at)],
              ["Points", c.points],
            ].filter(Boolean).map(([label, val]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-slate-400 whitespace-nowrap text-xs">{label}</dt>
                <dd className="text-right font-medium text-[#20364D] truncate max-w-[180px] text-xs">{val || "-"}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sales Ownership</h3>
          <dl className="mt-3 space-y-2 text-sm">
            {[
              ["Sales Rep", c.assigned_sales?.name],
              ["Phone", c.assigned_sales?.phone],
              ["Email", c.assigned_sales?.email],
              ["Last Activity", fmtDate(c.last_activity_at)],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-slate-400 whitespace-nowrap text-xs">{label}</dt>
                <dd className="text-right font-medium text-[#20364D] text-xs">{val || "-"}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}

function LazyTab({ customerId, fetchFn, columns, emptyMessage }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFn(customerId)
      .then(r => setData(r.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) return <p className="py-8 text-center text-sm text-slate-400">Loading...</p>;
  if (!data || data.length === 0) return <p className="py-8 text-center text-sm text-slate-400">{emptyMessage}</p>;

  return <TransactionTable items={data} columns={columns} />;
}

function NotesTab({ notes }) {
  return notes ? (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm text-slate-700 whitespace-pre-wrap">{notes}</div>
  ) : (
    <p className="py-8 text-center text-sm text-slate-400">No internal notes yet.</p>
  );
}

export default function CustomerDrawer360({ customer }) {
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();

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
              {customer.company && customer.company !== "-" && (customer.type || "").toLowerCase() !== "individual" && (
                <span className="ml-2 text-slate-400">| {customer.company}</span>
              )}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusColor[customer.status] || statusColor.inactive}`}>
              {(customer.status || "inactive").replace("_", " ")}
            </span>
            <button
              onClick={() => navigate(`/admin/customers/${customer.id}`)}
              data-testid="view-full-profile-btn"
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Full Profile
            </button>
          </div>
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
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
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
        {activeTab === "requests" && (
          <LazyTab
            customerId={customer.id}
            fetchFn={adminApi.getCustomer360Requests}
            emptyMessage="No requests."
            columns={[
              { key: "date", label: "Date", render: (r) => <span className="text-slate-500 text-xs">{fmtDate(r.date)}</span> },
              { key: "type", label: "Type", render: (r) => <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">{r.type}</span> },
              { key: "subject", label: "Subject", render: (r) => <span className="font-semibold text-[#20364D]">{r.subject}</span> },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        )}
        {activeTab === "orders" && (
          <LazyTab
            customerId={customer.id}
            fetchFn={adminApi.getCustomer360Orders}
            emptyMessage="No orders."
            columns={[
              { key: "date", label: "Date", render: (o) => <span className="text-slate-500 text-xs">{fmtDate(o.date)}</span> },
              { key: "order_no", label: "Order #", render: (o) => <span className="font-semibold text-[#20364D]">{o.order_no}</span> },
              { key: "amount", label: "Amount", align: "right", render: (o) => <span className="font-semibold">{o.amount}</span> },
              { key: "fulfillment_state", label: "Fulfillment", render: (o) => <StatusBadge status={o.fulfillment_state} /> },
            ]}
          />
        )}
        {activeTab === "quotes" && (
          <LazyTab
            customerId={customer.id}
            fetchFn={adminApi.getCustomer360Quotes}
            emptyMessage="No quotes."
            columns={[
              { key: "date", label: "Date", render: (q) => <span className="text-slate-500 text-xs">{fmtDate(q.date)}</span> },
              { key: "quote_no", label: "Quote #", render: (q) => <span className="font-semibold text-[#20364D]">{q.quote_no}</span> },
              { key: "amount", label: "Amount", align: "right", render: (q) => <span className="font-semibold">{q.amount}</span> },
              { key: "status", label: "Status", render: (q) => <StatusBadge status={q.status} /> },
            ]}
          />
        )}
        {activeTab === "invoices" && (
          <LazyTab
            customerId={customer.id}
            fetchFn={adminApi.getCustomer360Invoices}
            emptyMessage="No invoices."
            columns={[
              { key: "date", label: "Date", render: (i) => <span className="text-slate-500 text-xs">{fmtDate(i.date)}</span> },
              { key: "invoice_no", label: "Invoice #", render: (i) => <span className="font-semibold text-[#20364D]">{i.invoice_no}</span> },
              { key: "amount", label: "Amount", align: "right", render: (i) => <span className="font-semibold">{i.amount}</span> },
              { key: "payment_status", label: "Payment", render: (i) => <StatusBadge status={i.payment_status} /> },
            ]}
          />
        )}
        {activeTab === "payments" && (
          <LazyTab
            customerId={customer.id}
            fetchFn={adminApi.getCustomer360Payments}
            emptyMessage="No payments."
            columns={[
              { key: "date", label: "Date", render: (p) => <span className="text-slate-500 text-xs">{fmtDate(p.date)}</span> },
              { key: "reference", label: "Reference", render: (p) => <span className="font-semibold text-[#20364D]">{p.reference}</span> },
              { key: "amount", label: "Amount", align: "right", render: (p) => <span className="font-semibold">{p.amount}</span> },
              { key: "status", label: "Status", render: (p) => <StatusBadge status={p.status} /> },
            ]}
          />
        )}
        {activeTab === "statement" && <StatementOfAccountTab customerId={customer.id} />}
        {activeTab === "notes" && <NotesTab notes={customer.notes} />}
      </div>
    </div>
  );
}
