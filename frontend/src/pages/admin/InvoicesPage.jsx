import React, { useEffect, useMemo, useState } from "react";
import { Receipt, Download, Send, Search, RefreshCcw, X, ChevronDown, ChevronUp, FileText, CreditCard, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { calculateTotals, formatMoney } from "@/utils/finance";
import CustomerSummaryCard from "@/components/admin/CustomerSummaryCard";
import PaymentTermsCard from "@/components/admin/PaymentTermsCard";
import TaxSummaryCard from "@/components/admin/TaxSummaryCard";
import LineItemsEditor from "@/components/admin/LineItemsEditor";
import BrandLogo from "@/components/branding/BrandLogo";
import CustomerLinkCell from "@/components/customers/CustomerLinkCell";
import { safeDisplay } from "@/utils/safeDisplay";
import StandardSummaryCardsRow from "@/components/lists/StandardSummaryCardsRow";
import PhoneNumberField from "@/components/forms/PhoneNumberField";

const invoiceStatuses = ["draft", "sent", "partially_paid", "paid", "overdue", "cancelled"];
const statusColors = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  partially_paid: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
  pending_payment: "bg-amber-100 text-amber-700",
  under_review: "bg-blue-100 text-blue-700",
  pending_verification: "bg-blue-100 text-blue-700",
  payment_under_review: "bg-blue-100 text-blue-700",
  proof_uploaded: "bg-blue-100 text-blue-700",
  payment_proof_uploaded: "bg-blue-100 text-blue-700",
  approved: "bg-teal-100 text-teal-700",
  proof_rejected: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
  awaiting_payment_proof: "bg-amber-100 text-amber-700",
};

const API_URL = process.env.REACT_APP_BACKEND_URL || "";
function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function fmtDate(v) { try { return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "-"; } }

function InvoiceDrawer({ invoice, onClose, onStatusChange, onSend }) {
  if (!invoice) return null;
  const status = invoice.status || "draft";
  const items = invoice.items || invoice.line_items || [];
  const total = Number(invoice.total_amount || invoice.total || 0);
  const paid = Number(invoice.amount_paid || 0);
  const balance = total - paid;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="admin-invoice-drawer">
      <button className="absolute inset-0 bg-[#20364D]/30 backdrop-blur-[3px]" onClick={onClose} />
      <div className="relative w-full max-w-[520px] h-full bg-white shadow-2xl border-l border-slate-200 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#20364D] to-[#2f526f] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <BrandLogo size="sm" variant="light" className="mb-3" />
              <div className="text-lg font-semibold">Invoice Detail</div>
              <div className="text-xs text-white/70 mt-1">{invoice.invoice_number}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${statusColors[status] || "bg-slate-100 text-slate-700"}`}>{status.replace(/_/g, " ")}</span>
              <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/20"><X className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border p-4 bg-slate-50/50">
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">Customer</div>
              <div className="font-semibold text-[#20364D] text-sm">{safeDisplay(invoice.customer_name, "person")}</div>
              <div className="text-xs text-slate-500">{invoice.customer_company || ""}</div>
              <div className="text-xs text-slate-500">{invoice.customer_email || ""}</div>
            </div>
            <div className="rounded-xl border p-4 bg-slate-50/50">
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">Dates</div>
              <div className="text-xs text-slate-500">Created</div>
              <div className="font-semibold text-[#20364D] text-sm">{fmtDate(invoice.created_at)}</div>
              {invoice.due_date && <><div className="text-xs text-slate-500 mt-1">Due</div><div className="font-semibold text-[#20364D] text-sm">{fmtDate(invoice.due_date)}</div></>}
            </div>
          </div>

          <div className="rounded-xl border overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b font-semibold text-[#20364D] text-sm">Line Items</div>
            <div className="divide-y divide-slate-100">
              {items.length ? items.map((item, idx) => (
                <div key={idx} className="px-4 py-3 flex items-center justify-between text-sm">
                  <div><div className="font-medium text-[#20364D]">{item.description || item.name || `Item ${idx + 1}`}</div><div className="text-xs text-slate-400">Qty {item.quantity || 1}</div></div>
                  <div className="font-semibold text-[#20364D]">{money(item.total || ((item.unit_price || item.price || 0) * (item.quantity || 1)))}</div>
                </div>
              )) : <div className="px-4 py-6 text-sm text-slate-400 text-center">No items</div>}
            </div>
          </div>

          <div className="rounded-xl border p-4 bg-slate-50/50 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span>{money(invoice.subtotal || invoice.subtotal_amount)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">VAT</span><span>{money(invoice.vat_amount || invoice.tax || 0)}</span></div>
            {paid > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">Paid</span><span className="text-green-700">-{money(paid)}</span></div>}
            <div className="flex justify-between text-base pt-2 border-t border-slate-200 font-semibold text-[#20364D]"><span>{paid > 0 ? "Balance Due" : "Total"}</span><span>{money(paid > 0 ? balance : total)}</span></div>
          </div>

          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <select className="border rounded-xl px-4 py-3 text-sm" value={status} onChange={(e) => onStatusChange(invoice.id, e.target.value)}>
              {invoiceStatuses.map((s) => (<option key={s} value={s}>{s.replace(/_/g, " ")}</option>))}
            </select>
            <a href={`${API_URL}/api/pdf/invoices/${invoice.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-5 py-3 text-sm font-semibold hover:bg-[#2a4a66]" data-testid="admin-download-pdf"><Download className="w-4 h-4" /> PDF</a>
            <button type="button" onClick={() => onSend(invoice.id)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold hover:bg-slate-50"><Send className="w-4 h-4" /> Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [orderId, setOrderId] = useState("");
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [form, setForm] = useState({ customer_name: "", customer_email: "", customer_company: "", customer_phone: "", customer_address: "", customer_tin: "", customer_registration_number: "", currency: "TZS", notes: "", terms: "" });
  const [lineItems, setLineItems] = useState([{ sku: "", description: "", quantity: 1, unit_price: 0, total: 0 }]);
  const [discount, setDiscount] = useState(0);

  const taxEnabled = settings?.tax_enabled ?? true;
  const taxRate = settings?.tax_rate ?? 18;
  const taxName = settings?.tax_name || "VAT";
  const totals = useMemo(() => calculateTotals({ lineItems, discount, taxRate, taxEnabled }), [lineItems, discount, taxRate, taxEnabled]);

  const load = async () => {
    try { setLoading(true);
      const [invoicesRes, customersRes, settingsRes] = await Promise.all([adminApi.getInvoices(), adminApi.getCustomers(), adminApi.getCompanySettings()]);
      setInvoices(invoicesRes.data || []); setCustomers(customersRes.data || []); setSettings(settingsRes.data || null);
      if (settingsRes.data?.currency) setForm((prev) => ({ ...prev, currency: settingsRes.data.currency }));
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const selectCustomer = (customerId) => {
    setSelectedCustomerId(customerId);
    const customer = customers.find((c) => c.id === customerId);
    setSelectedCustomer(customer || null);
    if (customer) {
      const address = [customer.address_line_1, customer.address_line_2, customer.city, customer.country].filter(Boolean).join(", ");
      setForm((prev) => ({ ...prev, customer_name: customer.contact_name || "", customer_email: customer.email || "", customer_company: customer.company_name || "", customer_phone: customer.phone || "", customer_address: address, customer_tin: customer.tax_number || "", customer_registration_number: customer.business_registration_number || "" }));
    }
  };

  const fetchPricing = async (index, sku) => {
    try { const res = await adminApi.getProductPricingBySku(sku); const next = [...lineItems]; next[index].sku = sku; next[index].description = res.data.name || res.data.product_title || ""; next[index].unit_price = Number(res.data.unit_price || res.data.price || 0); next[index].total = Number(next[index].quantity || 0) * Number(next[index].unit_price || 0); setLineItems(next); } catch { console.log("SKU not found"); }
  };

  const createInvoice = async (e) => {
    e.preventDefault();
    const payload = { ...form, line_items: lineItems.map((item) => ({ description: item.description, quantity: Number(item.quantity), unit_price: Number(item.unit_price), total: Number(item.total) })), subtotal: totals.subtotal, discount: totals.discount, tax: totals.tax, tax_rate: taxRate, total: totals.total, due_date: invoiceDueDate || null, notes: form.notes, terms: form.terms, payment_term_type: selectedCustomer?.payment_term_type || "due_on_receipt", payment_term_days: selectedCustomer?.payment_term_days || 0, payment_term_label: selectedCustomer?.payment_term_label || "Due on Receipt", payment_term_notes: selectedCustomer?.payment_term_notes || "", status: "draft" };
    try { await adminApi.createInvoice(payload); setSelectedCustomerId(""); setSelectedCustomer(null); setForm({ customer_name: "", customer_email: "", customer_company: "", customer_phone: "", customer_address: "", customer_tin: "", customer_registration_number: "", currency: settings?.currency || "TZS", notes: "", terms: "" }); setLineItems([{ sku: "", description: "", quantity: 1, unit_price: 0, total: 0 }]); setDiscount(0); setInvoiceDueDate(""); setShowForm(false); load(); } catch (error) { console.error(error); alert(error.response?.data?.detail || "Failed to create invoice"); }
  };

  const changeStatus = async (invoiceId, status) => { await adminApi.updateInvoiceStatus(invoiceId, status); load(); };
  const convertFromOrder = async (e) => { e.preventDefault(); if (!orderId) return; try { await adminApi.convertOrderToInvoice(orderId, invoiceDueDate || null); setOrderId(""); setInvoiceDueDate(""); load(); alert("Invoice created from order"); } catch (error) { alert(error.response?.data?.detail || "Failed"); } };
  const sendInvoice = async (invoiceId) => { try { await adminApi.sendInvoiceDocument(invoiceId); alert("Invoice email sent"); } catch (error) { alert(error.response?.data?.detail || "Failed"); } };

  const filteredInvoices = invoices.filter((inv) => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (inv.invoice_number?.toLowerCase().includes(t) || inv.customer_name?.toLowerCase().includes(t) || inv.customer_company?.toLowerCase().includes(t));
  });

  // Stats from local data
  const invStats = {
    total: invoices.length,
    draft: invoices.filter(i => i.status === "draft").length,
    sent: invoices.filter(i => ["sent", "issued"].includes(i.status)).length,
    paid: invoices.filter(i => i.status === "paid" || i.status === "approved").length,
    overdue: invoices.filter(i => i.status === "overdue").length,
    unpaid: invoices.filter(i => ["unpaid", "pending", "pending_payment", "awaiting_payment_proof", "partially_paid"].includes(i.status)).length,
  };

  return (
    <div className="space-y-4" data-testid="invoices-page">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-[#20364D]">Invoices</h1><p className="text-slate-500 text-sm">Invoices are auto-generated from accepted quotes and marketplace checkout</p></div>
      </div>

      {/* Stat Cards */}
      <StandardSummaryCardsRow
        columns={6}
        cards={[
          { label: "Total", value: invStats.total, icon: FileText, accent: "slate" },
          { label: "Draft", value: invStats.draft, icon: Clock, accent: "amber" },
          { label: "Sent", value: invStats.sent, icon: Send, accent: "blue" },
          { label: "Paid", value: invStats.paid, icon: CheckCircle, accent: "emerald" },
          { label: "Overdue", value: invStats.overdue, icon: AlertTriangle, accent: "red" },
          { label: "Unpaid", value: invStats.unpaid, icon: CreditCard, accent: "violet" },
        ]}
      />

      {/* Collapsible create form */}
      {showForm && (
        <div className="grid xl:grid-cols-2 gap-6">
          <form onSubmit={createInvoice} className="space-y-5" data-testid="invoice-form">
            <div className="rounded-2xl border bg-white p-5 space-y-4"><h2 className="text-lg font-bold">Select Customer</h2>
              <select className="w-full border rounded-xl px-4 py-3" value={selectedCustomerId} onChange={(e) => selectCustomer(e.target.value)} data-testid="customer-select"><option value="">Choose customer...</option>{customers.map((c) => (<option key={c.id} value={c.id}>{c.company_name} — {c.contact_name}</option>))}</select>
              <div className="grid md:grid-cols-2 gap-3">
                <input className="border rounded-xl px-4 py-3" placeholder="Contact Name *" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
                <input className="border rounded-xl px-4 py-3" placeholder="Email *" type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} required />
                <input className="border rounded-xl px-4 py-3" placeholder="Company" value={form.customer_company} onChange={(e) => setForm({ ...form, customer_company: e.target.value })} />
                <PhoneNumberField
                  label=""
                  prefix={form.customer_phone_prefix || "+255"}
                  number={form.customer_phone}
                  onPrefixChange={(v) => setForm({ ...form, customer_phone_prefix: v })}
                  onNumberChange={(v) => setForm({ ...form, customer_phone: v })}
                  testIdPrefix="invoice-customer-phone"
                />
                <input className="border rounded-xl px-4 py-3 md:col-span-2" placeholder="Address" value={form.customer_address} onChange={(e) => setForm({ ...form, customer_address: e.target.value })} />
                <input className="border rounded-xl px-4 py-3" placeholder="Client TIN" value={form.customer_tin} onChange={(e) => setForm({ ...form, customer_tin: e.target.value })} />
                <input className="border rounded-xl px-4 py-3" placeholder="Client BRN" value={form.customer_registration_number} onChange={(e) => setForm({ ...form, customer_registration_number: e.target.value })} />
              </div>
            </div>
            <LineItemsEditor items={lineItems} setItems={setLineItems} onFetchPricing={fetchPricing} currency={form.currency} />
            <div className="rounded-2xl border bg-white p-5 space-y-4"><h2 className="text-lg font-bold">Commercial Details</h2>
              <div className="grid md:grid-cols-2 gap-3"><div><label className="text-xs text-slate-500 mb-1 block">Due Date</label><input className="w-full border rounded-xl px-4 py-3" type="date" value={invoiceDueDate} onChange={(e) => setInvoiceDueDate(e.target.value)} /></div><div><label className="text-xs text-slate-500 mb-1 block">Discount</label><input className="w-full border rounded-xl px-4 py-3" type="number" min="0" placeholder="0" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></div></div>
              <textarea className="w-full border rounded-xl px-4 py-3 min-h-[80px]" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <button type="submit" className="w-full rounded-xl bg-[#20364D] text-white py-4 font-semibold hover:bg-[#2a4a66] transition" data-testid="save-invoice-btn">Save Invoice</button>
          </form>

          <div className="space-y-5">
            {selectedCustomer && <div className="grid md:grid-cols-2 gap-4"><CustomerSummaryCard customer={selectedCustomer} /><PaymentTermsCard customer={selectedCustomer} /></div>}
            <TaxSummaryCard currency={form.currency} taxName={taxName} subtotal={totals.subtotal} discount={totals.discount} tax={totals.tax} total={totals.total} />
            <form onSubmit={convertFromOrder} className="rounded-2xl border bg-white p-5 space-y-4"><div className="flex items-center gap-2"><RefreshCcw className="w-5 h-5" /><h2 className="text-lg font-bold">Convert Order to Invoice</h2></div><input className="w-full border rounded-xl px-4 py-3" placeholder="Order ID" value={orderId} onChange={(e) => setOrderId(e.target.value)} /><button type="submit" className="w-full rounded-xl border px-5 py-3 font-medium hover:bg-slate-50 transition">Convert</button></form>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input type="text" placeholder="Search invoices..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-xl border focus:ring-2 focus:ring-[#D4A843] outline-none" data-testid="search-invoices-input" />
      </div>

      {/* Invoice Table — enriched */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="admin-invoices-table">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-5 py-4 text-left">Date</th>
                <th className="px-5 py-4 text-left">Invoice No</th>
                <th className="px-5 py-4 text-left">Customer</th>
                <th className="px-5 py-4 text-left">Type</th>
                <th className="px-5 py-4 text-right">Amount</th>
                <th className="px-5 py-4 text-left">Payer Name</th>
                <th className="px-5 py-4 text-left">Payment Status</th>
                <th className="px-5 py-4 text-left">Invoice Status</th>
                <th className="px-5 py-4 text-left">Linked Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="9" className="px-6 py-10 text-center text-slate-400">Loading...</td></tr>
              ) : filteredInvoices.length === 0 ? (
                <tr><td colSpan="9" className="px-6 py-10 text-center text-slate-400">No invoices found</td></tr>
              ) : [...filteredInvoices].sort((a,b) => new Date(b.created_at||0)-new Date(a.created_at||0)).map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50/70 cursor-pointer transition-colors" onClick={() => setSelectedInvoice(invoice)} data-testid={`invoice-row-${invoice.id}`}>
                  <td className="px-5 py-4 text-[#20364D]">{fmtDate(invoice.created_at)}</td>
                  <td className="px-5 py-4 font-semibold text-[#20364D]">{invoice.invoice_number}</td>
                  <td className="px-5 py-4">
                    <CustomerLinkCell customerId={invoice.customer_id} customerName={invoice.customer_name || invoice.customer_company} />
                  </td>
                  <td className="px-5 py-4 text-slate-600 capitalize">{safeDisplay(invoice.source_type || invoice.type, "text")}</td>
                  <td className="px-5 py-4 text-right font-semibold text-[#20364D]">{money(invoice.total_amount || invoice.total)}</td>
                  <td className="px-5 py-4 text-slate-600">{safeDisplay(invoice.payer_name, "person")}</td>
                  <td className="px-5 py-4"><span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${statusColors[invoice.payment_state || invoice.payment_status] || statusColors[invoice.status] || "bg-slate-100 text-slate-700"}`}>{invoice.payment_status_label || (invoice.payment_state || invoice.payment_status || invoice.status || "draft").replace(/_/g, " ")}</span></td>
                  <td className="px-5 py-4"><span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${statusColors[invoice.invoice_status || invoice.status] || "bg-slate-100 text-slate-700"}`}>{(invoice.invoice_status || invoice.status || "draft").replace(/_/g, " ")}</span></td>
                  <td className="px-5 py-4 text-xs text-slate-500">{safeDisplay(invoice.linked_ref, "code")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <InvoiceDrawer invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} onStatusChange={changeStatus} onSend={sendInvoice} />
    </div>
  );
}
