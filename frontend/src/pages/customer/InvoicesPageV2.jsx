import React, { useEffect, useMemo, useState } from "react";
import { Download, Eye, FileText, Receipt, X, AlertCircle } from "lucide-react";
import axios from "axios";
import FilterBar from "../../components/ui/FilterBar";
import PageHeader from "../../components/ui/PageHeader";
import BrandLogo from "../../components/branding/BrandLogo";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function fmtDate(v) { try { return new Date(v).toLocaleDateString("en-GB"); } catch { return "-"; } }

function statusMeta(invoice) {
  const paymentStatus = invoice.payment_status || invoice.status || "pending_payment";
  if (["under_review", "awaiting_review"].includes(paymentStatus)) return { label: "Under Review", cls: "bg-blue-100 text-blue-700" };
  if (["partially_paid"].includes(paymentStatus)) return { label: "Partially Paid", cls: "bg-amber-100 text-amber-700" };
  if (["paid"].includes(paymentStatus) || invoice.status === "paid") return { label: "Paid", cls: "bg-green-100 text-green-700" };
  if (["proof_rejected", "rejected"].includes(paymentStatus)) return { label: "Rejected", cls: "bg-red-100 text-red-700" };
  if (["awaiting_payment_proof"].includes(paymentStatus)) return { label: "Awaiting Proof", cls: "bg-amber-100 text-amber-700" };
  return { label: "Waiting for Approval", cls: "bg-slate-100 text-slate-700" };
}

function getPrimaryAction(invoice) {
  const paymentStatus = invoice.payment_status || invoice.status;
  if (["under_review", "awaiting_review"].includes(paymentStatus)) return "Under Review";
  if (["partially_paid"].includes(paymentStatus)) return "Pay Balance";
  if (["paid"].includes(paymentStatus) || invoice.status === "paid") return "Paid";
  if (["proof_rejected", "rejected"].includes(paymentStatus)) return "Resubmit Payment";
  return "Pay Invoice";
}

function InvoiceDrawer({ invoice, onClose }) {
  if (!invoice) return null;
  const status = statusMeta(invoice);
  const action = getPrimaryAction(invoice);
  const items = invoice.items || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="invoice-drawer">
      <button className="absolute inset-0 bg-black/35" onClick={onClose} aria-label="Close drawer" />
      <div className="relative w-full max-w-[520px] h-full bg-white shadow-2xl border-l border-slate-200 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
          <div className="px-6 py-5 bg-gradient-to-r from-[#20364D] to-[#2f526f] text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <BrandLogo size="sm" variant="light" className="mb-3" />
                <div className="text-lg font-semibold">Invoice Preview</div>
                <div className="text-xs text-white/75 mt-1">{invoice.invoice_number || invoice.id}</div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/20">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Date</div>
              <div className="font-semibold text-[#20364D]">{fmtDate(invoice.created_at)}</div>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${status.cls}`}>{status.label}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Bill To</div>
              <div className="font-semibold text-[#20364D]">{invoice.customer_name || invoice.customer_email || "Customer"}</div>
              <div className="text-sm text-slate-500 mt-1">{invoice.customer_email || ""}</div>
              <div className="text-sm text-slate-500">{invoice.customer_id || ""}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Invoice Summary</div>
              <div className="text-sm text-slate-500">Source</div>
              <div className="font-semibold text-[#20364D] capitalize">{invoice.type || invoice.source_type || "product"}</div>
              <div className="text-sm text-slate-500 mt-2">Payment</div>
              <div className="font-semibold text-[#20364D]">{invoice.payment_mode || action}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-[#20364D]">Line Items</div>
            <div className="divide-y divide-slate-100">
              {items.length ? items.map((item, idx) => (
                <div key={idx} className="px-4 py-3 flex items-center justify-between gap-4 text-sm">
                  <div>
                    <div className="font-medium text-[#20364D]">{item.name || item.title || `Item ${idx + 1}`}</div>
                    <div className="text-slate-500">Qty {item.quantity || 1}</div>
                  </div>
                  <div className="font-semibold text-[#20364D]">{money(item.line_total || (Number(item.price || item.unit_price || 0) * Number(item.quantity || 1)))}</div>
                </div>
              )) : <div className="px-4 py-6 text-sm text-slate-500">No items found on this invoice.</div>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-medium text-[#20364D]">{money(invoice.subtotal_amount || invoice.subtotal || invoice.total)}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-slate-500">VAT</span><span className="font-medium text-[#20364D]">{money(invoice.vat_amount || 0)}</span></div>
            <div className="flex items-center justify-between text-base pt-2 border-t border-slate-200"><span className="font-semibold text-[#20364D]">Total</span><span className="font-bold text-[#20364D]">{money(invoice.total_amount || invoice.total)}</span></div>
          </div>

          {(invoice.rejection_reason || invoice.payment_status === "proof_rejected") && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <div className="font-semibold text-red-700">Payment Rejected</div>
                <div className="text-sm text-red-600 mt-1">{invoice.rejection_reason || "Please submit a corrected payment proof."}</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            {invoice.pdf_url ? (
              <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-4 py-3 text-sm font-semibold hover:bg-[#2a4a66]">
                <Download className="w-4 h-4" /> Download Invoice
              </a>
            ) : (
              <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-4 py-3 text-sm font-semibold opacity-80 cursor-default">
                <Download className="w-4 h-4" /> Download Invoice
              </button>
            )}
            <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${status.cls}`}>{action}</div>
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
          { value: "pending_payment", label: "Waiting for Approval" },
          { value: "awaiting_payment_proof", label: "Awaiting Proof" },
          { value: "under_review", label: "Under Review" },
          { value: "partially_paid", label: "Partially Paid" },
          { value: "paid", label: "Paid" },
          { value: "proof_rejected", label: "Rejected" },
        ] }]}
      />

      <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
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
                const status = statusMeta(invoice);
                return (
                  <tr key={invoice.id || invoice._id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedInvoice(invoice)}>
                    <td className="px-6 py-4 font-medium text-[#20364D]">{fmtDate(invoice.created_at)}</td>
                    <td className="px-6 py-4 font-semibold text-[#20364D]">{invoice.invoice_number || invoice.id}</td>
                    <td className="px-6 py-4 capitalize text-slate-600">{invoice.type || invoice.source_type || "product"}</td>
                    <td className="px-6 py-4 font-semibold text-[#20364D]">{money(invoice.total_amount || invoice.total)}</td>
                    <td className="px-6 py-4"><span className={`text-xs px-3 py-1 rounded-full font-medium ${status.cls}`}>{status.label}</span></td>
                    <td className="px-6 py-4"><button type="button" className="inline-flex items-center gap-2 text-[#20364D] font-semibold"><Eye className="w-4 h-4" /> View</button></td>
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
