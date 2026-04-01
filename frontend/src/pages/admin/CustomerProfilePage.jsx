import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { adminApi } from "@/lib/adminApi";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import StatementOfAccountTab from "@/components/customers/StatementOfAccountTab";
import {
  User, FileText, Receipt, ShoppingCart, MessageSquare,
  ArrowLeft, Inbox, CreditCard, BookOpen,
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
    <div className={`rounded-xl border p-3.5 ${colors[accent] || colors.slate}`}>
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-extrabold text-[#20364D]">{value ?? 0}</div>
    </div>
  );
}

function TransactionTable({ items, columns, emptyMessage = "No records yet." }) {
  if (!items || items.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">{emptyMessage}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left">
            {columns.map((col) => (
              <th key={col.key} className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 ${col.align === "right" ? "text-right" : ""}`}>
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
    </div>
  );
}

function OverviewTab({ customer }) {
  const c = customer;
  const kpis = c.profile_kpis || {};
  const summary = c.summary || {};
  return (
    <div className="space-y-5">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <KpiCard label="Total Revenue" value={fmtMoney(kpis.total_revenue)} accent="emerald" />
        <KpiCard label="Outstanding" value={fmtMoney(kpis.outstanding_balance)} accent="red" />
        <KpiCard label="Total Paid" value={fmtMoney(kpis.total_paid)} accent="teal" />
        <KpiCard label="Avg Order Value" value={fmtMoney(kpis.avg_order_value)} accent="blue" />
        <KpiCard label="Punctuality" value={`${kpis.payment_punctuality_pct || 0}%`} accent="amber" />
      </div>

      {/* Counts */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <KpiCard label="Requests" value={summary.total_requests} accent="orange" />
        <KpiCard label="Active Req" value={summary.active_requests} accent="orange" />
        <KpiCard label="Orders" value={summary.total_orders} accent="violet" />
        <KpiCard label="Active Orders" value={summary.active_orders} accent="amber" />
        <KpiCard label="Quotes" value={summary.total_quotes} accent="blue" />
        <KpiCard label="Invoices" value={summary.total_invoices} accent="emerald" />
        <KpiCard label="Unpaid" value={summary.unpaid_invoices} accent="red" />
        <KpiCard label="Payments" value={summary.total_payments} accent="teal" />
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

function RequestsTab({ customerId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getCustomer360Requests(customerId)
      .then(r => setData(r.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Loading requests...</p>;

  return (
    <TransactionTable
      items={data}
      emptyMessage="No requests found for this customer."
      columns={[
        { key: "date", label: "Date", render: (r) => <span className="text-slate-500 text-xs">{fmtDate(r.date)}</span> },
        { key: "type", label: "Type", render: (r) => <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">{r.type}</span> },
        { key: "subject", label: "Subject", render: (r) => <span className="font-semibold text-[#20364D]">{r.subject}</span> },
        { key: "source", label: "Source", render: (r) => <span className="text-slate-500">{r.source}</span> },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}

function OrdersTab({ customerId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getCustomer360Orders(customerId)
      .then(r => setData(r.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Loading orders...</p>;

  return (
    <TransactionTable
      items={data}
      emptyMessage="No orders found for this customer."
      columns={[
        { key: "date", label: "Date", render: (o) => <span className="text-slate-500 text-xs">{fmtDate(o.date)}</span> },
        { key: "order_no", label: "Order #", render: (o) => <span className="font-semibold text-[#20364D]">{o.order_no}</span> },
        { key: "amount", label: "Amount", align: "right", render: (o) => <span className="font-semibold">{o.amount}</span> },
        { key: "payment_status", label: "Payment", render: (o) => <StatusBadge status={o.payment_status} /> },
        { key: "fulfillment_state", label: "Fulfillment", render: (o) => <StatusBadge status={o.fulfillment_state} /> },
      ]}
    />
  );
}

function QuotesTab({ customerId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getCustomer360Quotes(customerId)
      .then(r => setData(r.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Loading quotes...</p>;

  return (
    <TransactionTable
      items={data}
      emptyMessage="No quotes found for this customer."
      columns={[
        { key: "date", label: "Date", render: (q) => <span className="text-slate-500 text-xs">{fmtDate(q.date)}</span> },
        { key: "quote_no", label: "Quote #", render: (q) => <span className="font-semibold text-[#20364D]">{q.quote_no}</span> },
        { key: "amount", label: "Amount", align: "right", render: (q) => <span className="font-semibold">{q.amount}</span> },
        { key: "valid_until", label: "Valid Until", render: (q) => <span className="text-slate-500 text-xs">{fmtDate(q.valid_until)}</span> },
        { key: "status", label: "Status", render: (q) => <StatusBadge status={q.status} /> },
      ]}
    />
  );
}

function InvoicesTab({ customerId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getCustomer360Invoices(customerId)
      .then(r => setData(r.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Loading invoices...</p>;

  return (
    <TransactionTable
      items={data}
      emptyMessage="No invoices found for this customer."
      columns={[
        { key: "date", label: "Date", render: (i) => <span className="text-slate-500 text-xs">{fmtDate(i.date)}</span> },
        { key: "invoice_no", label: "Invoice #", render: (i) => <span className="font-semibold text-[#20364D]">{i.invoice_no}</span> },
        { key: "amount", label: "Amount", align: "right", render: (i) => <span className="font-semibold">{i.amount}</span> },
        { key: "due_date", label: "Due Date", render: (i) => <span className="text-slate-500 text-xs">{fmtDate(i.due_date)}</span> },
        { key: "payment_status", label: "Payment", render: (i) => <StatusBadge status={i.payment_status} /> },
      ]}
    />
  );
}

function PaymentsTab({ customerId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getCustomer360Payments(customerId)
      .then(r => setData(r.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Loading payments...</p>;

  return (
    <TransactionTable
      items={data}
      emptyMessage="No payments found for this customer."
      columns={[
        { key: "date", label: "Date", render: (p) => <span className="text-slate-500 text-xs">{fmtDate(p.date)}</span> },
        { key: "reference", label: "Reference", render: (p) => <span className="font-semibold text-[#20364D]">{p.reference}</span> },
        { key: "payer_name", label: "Payer", render: (p) => <span className="text-slate-600">{p.payer_name}</span> },
        { key: "amount", label: "Amount", align: "right", render: (p) => <span className="font-semibold">{p.amount}</span> },
        { key: "method", label: "Method", render: (p) => <span className="text-slate-500 text-xs">{p.method}</span> },
        { key: "status", label: "Status", render: (p) => <StatusBadge status={p.status} /> },
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
        <p className="py-10 text-center text-sm text-slate-400">No internal notes yet.</p>
      )}
    </div>
  );
}

export default function CustomerProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    setLoading(true);
    adminApi.getCustomer360Detail(id)
      .then(r => setCustomer(r.data))
      .catch(() => setCustomer(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-400">Loading customer profile...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="text-sm text-slate-400">Customer not found.</div>
        <button onClick={() => navigate("/admin/customers")} className="text-sm text-blue-600 hover:underline">Back to Customers</button>
      </div>
    );
  }

  const statusColor = {
    active: "bg-emerald-100 text-emerald-800",
    at_risk: "bg-amber-100 text-amber-800",
    inactive: "bg-slate-200 text-slate-600",
  };

  return (
    <div className="space-y-4" data-testid="customer-profile-page">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate("/admin/customers")}
          data-testid="back-to-customers"
          className="mt-1 rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Customer 360 Profile</p>
          <h1 className="text-2xl font-extrabold text-[#20364D]">{customer.name}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {customer.email}
            {customer.company && customer.company !== "-" && <span className="ml-2 text-slate-400">| {customer.company}</span>}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusColor[customer.status] || statusColor.inactive}`}>
          {(customer.status || "inactive").replace("_", " ")}
        </span>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-0" data-testid="profile-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              data-testid={`profile-tab-${tab.key}`}
              className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
                isActive
                  ? "border-[#20364D] text-[#20364D]"
                  : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {activeTab === "overview" && <OverviewTab customer={customer} />}
        {activeTab === "requests" && <RequestsTab customerId={customer.id} />}
        {activeTab === "orders" && <OrdersTab customerId={customer.id} />}
        {activeTab === "quotes" && <QuotesTab customerId={customer.id} />}
        {activeTab === "invoices" && <InvoicesTab customerId={customer.id} />}
        {activeTab === "payments" && <PaymentsTab customerId={customer.id} />}
        {activeTab === "statement" && <StatementOfAccountTab customerId={customer.id} />}
        {activeTab === "notes" && <NotesTab notes={customer.notes} />}
      </div>
    </div>
  );
}
