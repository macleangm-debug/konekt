import React, { useEffect, useMemo, useState } from "react";
import { Download, Eye, X, AlertCircle, CreditCard, RefreshCw } from "lucide-react";
import axios from "axios";
import FilterBar from "../../components/ui/FilterBar";
import PageHeader from "../../components/ui/PageHeader";
import BrandLogo from "../../components/branding/BrandLogo";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function fmtDate(v) { try { return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "-"; } }

function statusMeta(invoice) {
  const s = invoice.payment_status || invoice.status || "pending_payment";
  if (["under_review", "awaiting_review", "payment_under_review"].includes(s)) return { label: "Under Review", cls: "bg-blue-100 text-blue-700" };
  if (s === "partially_paid") return { label: "Partially Paid", cls: "bg-amber-100 text-amber-700" };
  if (s === "paid" || invoice.status === "paid") return { label: "Paid", cls: "bg-green-100 text-green-700" };
  if (["proof_rejected", "rejected", "payment_rejected"].includes(s)) return { label: "Rejected", cls: "bg-red-100 text-red-700" };
  if (s === "awaiting_payment_proof") return { label: "Awaiting Proof", cls: "bg-amber-100 text-amber-700" };
  return { label: "Pending Payment", cls: "bg-slate-100 text-slate-700" };
}

function getActionConfig(invoice) {
  const s = invoice.payment_status || invoice.status || "pending_payment";
  if (["pending_payment", "pending", "awaiting_payment_proof"].includes(s))
    return { type: "pay", label: "Pay Invoice", cls: "bg-[#20364D] text-white hover:bg-[#2a4a66]" };
  if (s === "partially_paid")
    return { type: "pay", label: "Pay Balance", cls: "bg-amber-600 text-white hover:bg-amber-700" };
  if (["proof_rejected", "rejected", "payment_rejected"].includes(s))
    return { type: "resubmit", label: "Resubmit Proof", cls: "bg-red-600 text-white hover:bg-red-700" };
  return null;
}

function InvoiceDrawer({ invoice, onClose }) {
  if (!invoice) return null;
  const status = statusMeta(invoice);
  const action = getActionConfig(invoice);
  const items = invoice.items || [];
  const subtotal = Number(invoice.subtotal_amount || invoice.subtotal || invoice.total_amount || 0);
  const vat = Number(invoice.vat_amount || 0);
  const total = Number(invoice.total_amount || invoice.total || 0);
  const amountPaid = Number(invoice.amount_paid || 0);
  const balanceDue = total - amountPaid;

  const handleDownload = () => {
    const id = invoice.id || invoice._id;
    window.open(`${API_URL}/api/pdf/invoices/${id}`, "_blank");
  };

  const billing = invoice.billing || {};
  const billingName = billing.invoice_client_name || invoice.customer_name || invoice.customer_email || "Customer";
  const billingEmail = billing.invoice_client_email || invoice.customer_email || "";
  const billingPhone = billing.invoice_client_phone || invoice.customer_phone || "";
  const billingTin = billing.invoice_client_tin || "";

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="invoice-drawer">
      <button className="absolute inset-0 bg-black/35" onClick={onClose} aria-label="Close drawer" />
      <div className="relative w-full max-w-[520px] h-full bg-white shadow-2xl border-l border-slate-200 overflow-y-auto">
        {/* Branded header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#20364D] to-[#2f526f]">
          <div className="px-6 py-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <BrandLogo size="sm" variant="light" className="mb-3" />
                <div className="text-lg font-semibold">Invoice Preview</div>
                <div className="text-xs text-white/70 mt-1">{invoice.invoice_number || invoice.id}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${status.cls}`}>{status.label}</span>
                <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/20" data-testid="close-drawer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Date + Type */}
          <div className="flex items-center justify-between text-sm">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">Date</div>
              <div className="font-semibold text-[#20364D]">{fmtDate(invoice.created_at)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 uppercase tracking-wide">Type</div>
              <div className="font-semibold text-[#20364D] capitalize">{invoice.type || invoice.source_type || "product"}</div>
            </div>
          </div>

          {/* Bill To + Invoice Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">Bill To</div>
              <div className="font-semibold text-[#20364D] text-sm">{billingName}</div>
              {billingEmail && <div className="text-xs text-slate-500 mt-1">{billingEmail}</div>}
              {billingPhone && <div className="text-xs text-slate-500">{billingPhone}</div>}
              {billingTin && <div className="text-xs text-slate-500">TIN: {billingTin}</div>}
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">Payment</div>
              <div className="text-xs text-slate-500">Terms</div>
              <div className="font-semibold text-[#20364D] text-sm">{invoice.payment_terms || "Due on receipt"}</div>
              {amountPaid > 0 && (
                <>
                  <div className="text-xs text-slate-500 mt-2">Paid</div>
                  <div className="font-semibold text-green-700 text-sm">{money(amountPaid)}</div>
                </>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <span className="font-semibold text-[#20364D] text-sm">Line Items</span>
            </div>
            <div className="divide-y divide-slate-100">
              {items.length ? items.map((item, idx) => (
                <div key={idx} className="px-4 py-3 flex items-center justify-between gap-4 text-sm">
                  <div>
                    <div className="font-medium text-[#20364D]">{item.name || item.title || `Item ${idx + 1}`}</div>
                    <div className="text-xs text-slate-400">Qty {item.quantity || 1} &times; {money(item.unit_price || item.price || 0)}</div>
                  </div>
                  <div className="font-semibold text-[#20364D]">{money(item.line_total || ((item.unit_price || item.price || 0) * (item.quantity || 1)))}</div>
                </div>
              )) : <div className="px-4 py-6 text-sm text-slate-400 text-center">No line items on this invoice.</div>}
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-medium text-[#20364D]">{money(subtotal)}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-slate-500">VAT</span><span className="font-medium text-[#20364D]">{money(vat)}</span></div>
            {amountPaid > 0 && <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Paid</span><span className="font-medium text-green-700">-{money(amountPaid)}</span></div>}
            <div className="flex items-center justify-between text-base pt-2 border-t border-slate-200">
              <span className="font-semibold text-[#20364D]">{amountPaid > 0 ? "Balance Due" : "Total"}</span>
              <span className="font-bold text-[#20364D]">{money(amountPaid > 0 ? balanceDue : total)}</span>
            </div>
          </div>

          {/* Rejection reason */}
          {(invoice.rejection_reason || ["proof_rejected", "rejected", "payment_rejected"].includes(invoice.payment_status)) && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-red-700 text-sm">Payment Rejected</div>
                <div className="text-sm text-red-600 mt-1">{invoice.rejection_reason || "Please submit a corrected payment proof."}</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-5 py-3 text-sm font-semibold hover:bg-[#2a4a66] transition-colors"
              data-testid="download-invoice-btn"
            >
              <Download className="w-4 h-4" /> Download Invoice
            </button>

            {action && action.type === "pay" && (
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors ${action.cls}`}
                data-testid="pay-invoice-btn"
              >
                <CreditCard className="w-4 h-4" /> {action.label}
              </button>
            )}

            {action && action.type === "resubmit" && (
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors ${action.cls}`}
                data-testid="resubmit-proof-btn"
              >
                <RefreshCw className="w-4 h-4" /> {action.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvoicesPageV2() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("konekt_token");
    if (!token) return;
    axios.get(`${API_URL}/api/customer/invoices`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setInvoices(res.data || []))
      .catch((err) => console.error("Failed to load invoices:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredInvoices = useMemo(() => invoices.filter((invoice) => {
    const q = searchValue.toLowerCase();
    const matchSearch = !q || [invoice.invoice_number, invoice.customer_name, invoice.type, invoice.payment_status, invoice.status]
      .filter(Boolean).join(" ").toLowerCase().includes(q);
    const matchStatus = !statusFilter || (invoice.payment_status || invoice.status) === statusFilter;
    return matchSearch && matchStatus;
  }), [invoices, searchValue, statusFilter]);

  return (
    <div data-testid="customer-invoices-page" className="space-y-6">
      <PageHeader title="My Invoices" subtitle="Track payments, review invoice status, and download your documents." />
      <FilterBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search invoices..."
        filters={[{ name: "status", value: statusFilter, onChange: setStatusFilter, placeholder: "All Statuses", options: [
          { value: "pending_payment", label: "Pending Payment" },
          { value: "awaiting_payment_proof", label: "Awaiting Proof" },
          { value: "under_review", label: "Under Review" },
          { value: "partially_paid", label: "Partially Paid" },
          { value: "paid", label: "Paid" },
          { value: "proof_rejected", label: "Rejected" },
        ] }]}
      />

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="invoices-table">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-left">Invoice</th>
                <th className="px-6 py-4 text-left">Type</th>
                <th className="px-6 py-4 text-left">Amount</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400">Loading invoices...</td></tr>
              ) : filteredInvoices.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400">No invoices found.</td></tr>
              ) : filteredInvoices.map((invoice) => {
                const st = statusMeta(invoice);
                return (
                  <tr key={invoice.id || invoice._id} className="hover:bg-slate-50/70 cursor-pointer transition-colors" onClick={() => setSelectedInvoice(invoice)} data-testid={`invoice-row-${invoice.id}`}>
                    <td className="px-6 py-4 text-[#20364D]">{fmtDate(invoice.created_at)}</td>
                    <td className="px-6 py-4 font-semibold text-[#20364D]">{invoice.invoice_number || invoice.id}</td>
                    <td className="px-6 py-4 capitalize text-slate-600">{invoice.type || invoice.source_type || "product"}</td>
                    <td className="px-6 py-4 font-semibold text-[#20364D]">{money(invoice.total_amount || invoice.total)}</td>
                    <td className="px-6 py-4"><span className={`text-xs px-3 py-1 rounded-full font-medium ${st.cls}`}>{st.label}</span></td>
                    <td className="px-6 py-4"><button type="button" className="inline-flex items-center gap-2 text-[#20364D] font-semibold text-sm hover:underline"><Eye className="w-4 h-4" /> View</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <InvoiceDrawer invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
    </div>
  );
}
