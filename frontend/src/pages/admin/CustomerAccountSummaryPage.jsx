import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../lib/api";

export default function CustomerAccountSummaryPage() {
  const { customerEmail } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get(`/api/admin/customer-accounts/${encodeURIComponent(customerEmail)}`);
      setData(res.data);
    } catch (error) {
      console.error("Failed to load account:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [customerEmail]);

  if (loading) return <div className="p-10" data-testid="loading-state">Loading account...</div>;
  if (!data) return <div className="p-10">Account not found</div>;

  const { profile, summary, quotes, invoices, orders, payments, service_requests, leads } = data;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="customer-account-page">
      <div className="rounded-3xl border bg-white p-6">
        <div className="text-3xl font-bold">{profile.user?.full_name || profile.customer?.name || profile.email}</div>
        <div className="text-slate-600 mt-2">{profile.email}</div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="summary-cards">
        <Card label="Quotes" value={summary.quotes_count} />
        <Card label="Invoices" value={summary.invoices_count} />
        <Card label="Orders" value={summary.orders_count} />
        <Card label="Payments" value={summary.payments_count} />
        <Card label="Service Requests" value={summary.service_requests_count} />
        <Card label="Leads" value={summary.leads_count} />
      </div>

      <div className="grid xl:grid-cols-3 gap-4">
        <Card label="Invoice Total" value={`TZS ${Number(summary.invoice_total || 0).toLocaleString()}`} />
        <Card label="Paid" value={`TZS ${Number(summary.invoice_paid || 0).toLocaleString()}`} />
        <Card label="Balance" value={`TZS ${Number(summary.invoice_balance || 0).toLocaleString()}`} highlight={summary.invoice_balance > 0} />
      </div>

      <GridPanel title="Quotes" items={quotes} primaryKey="quote_number" amountKey="total" statusKey="status" />
      <GridPanel title="Invoices" items={invoices} primaryKey="invoice_number" amountKey="total" statusKey="status" />
      <GridPanel title="Orders" items={orders} primaryKey="order_number" amountKey="total_amount" statusKey="status" />
      <GridPanel title="Payments" items={payments} primaryKey="reference" amountKey="amount" statusKey="status" />
      <GridPanel title="Service Requests" items={service_requests} primaryKey="service_title" amountKey="total_price" statusKey="status" />
      
      <div className="rounded-3xl border bg-white p-6">
        <h2 className="text-2xl font-bold">Related Leads</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-5">
          {(leads || []).length ? leads.map(lead => (
            <Link key={lead.id} to={`/admin/crm/leads/${lead.id}`} className="rounded-2xl border bg-slate-50 p-4 hover:bg-slate-100">
              <div className="font-semibold">{lead.name || "-"}</div>
              <div className="text-sm text-slate-500 mt-2">TZS {Number(lead.expected_value || 0).toLocaleString()}</div>
              <div className="text-sm text-slate-500 mt-1">{lead.stage || "-"}</div>
            </Link>
          )) : <div className="text-sm text-slate-500">No related leads.</div>}
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, highlight }) {
  return (
    <div className={`rounded-3xl border bg-white p-5 ${highlight ? 'border-amber-300 bg-amber-50' : ''}`}>
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`text-2xl font-bold mt-2 ${highlight ? 'text-amber-700' : ''}`}>{value}</div>
    </div>
  );
}

function GridPanel({ title, items, primaryKey, amountKey, statusKey }) {
  return (
    <div className="rounded-3xl border bg-white p-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-5">
        {(items || []).length ? items.map(item => (
          <div key={item.id} className="rounded-2xl border bg-slate-50 p-4">
            <div className="font-semibold">{item[primaryKey] || "-"}</div>
            <div className="text-sm text-slate-500 mt-2">{amountKey ? `TZS ${Number(item[amountKey] || 0).toLocaleString()}` : ""}</div>
            <div className="text-sm text-slate-500 mt-1">{item[statusKey] || "-"}</div>
          </div>
        )) : <div className="text-sm text-slate-500">No records found.</div>}
      </div>
    </div>
  );
}
