import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Download, Eye, X, AlertCircle, CreditCard, RefreshCw, Building2, Loader2 } from "lucide-react";
import axios from "axios";
import FilterBar from "../../components/ui/FilterBar";
import PageHeader from "../../components/ui/PageHeader";
import BrandLogo from "../../components/branding/BrandLogo";
import StandardDrawerShell from "../../components/ui/StandardDrawerShell";
import { safeDisplay } from "../../utils/safeDisplay";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }
function fmtDate(v) { try { return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "-"; } }

function statusMeta(invoice) {
  const s = invoice.payment_status || invoice.status || "pending_payment";
  const hasProof = !!(invoice.proof_url || invoice.payment_proof_url || invoice.proof_submitted_at);
  if (s === "approved") return { label: "Approved Payment", cls: "bg-teal-100 text-teal-700" };
  if (["under_review", "awaiting_review", "payment_under_review", "pending_payment_confirmation", "pending_verification", "proof_uploaded", "payment_proof_uploaded"].includes(s)) return { label: "Payment Under Review", cls: "bg-blue-100 text-blue-700" };
  if (s === "partially_paid") return { label: "Partially Paid", cls: "bg-amber-100 text-amber-700" };
  if (s === "paid" || invoice.status === "paid") return { label: "Paid in Full", cls: "bg-green-100 text-green-700" };
  if (["proof_rejected", "rejected", "payment_rejected"].includes(s)) return { label: "Payment Rejected", cls: "bg-red-100 text-red-700" };
  if (hasProof) return { label: "Payment Under Review", cls: "bg-blue-100 text-blue-700" };
  if (s === "awaiting_payment_proof") return { label: "Awaiting Payment", cls: "bg-amber-100 text-amber-700" };
  return { label: "Awaiting Payment", cls: "bg-slate-100 text-slate-700" };
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

function isPaid(invoice) {
  const s = invoice.payment_status || invoice.status || "";
  return s === "paid";
}

function isApprovedPayment(invoice) {
  const s = invoice.payment_status || invoice.status || "";
  return s === "approved";
}

function PaymentStatusBlock({ invoice, bankInfo }) {
  const paid = isPaid(invoice);
  const amountPaid = Number(invoice.amount_paid || 0);
  const hasProof = !!(invoice.proof_url || invoice.payment_proof_url || invoice.proof_submitted_at);
  const s = invoice.payment_status || invoice.status || "pending_payment";
  const isApproved = s === "approved";
  const isUnderReview = ["under_review", "awaiting_review", "payment_under_review", "pending_payment_confirmation", "pending_verification", "proof_uploaded", "payment_proof_uploaded"].includes(s) || (hasProof && !isApproved && !paid);

  if (paid) {
    return (
      <div className="rounded-xl border border-green-200 p-4 bg-green-50/50" data-testid="payment-status-block">
        <div className="text-xs uppercase tracking-wide text-green-600 mb-2 font-semibold">Payment Status</div>
        <div className="font-bold text-green-700 text-sm">Paid in Full</div>
        {invoice.paid_at && <div className="text-xs text-green-600 mt-1">Date: {fmtDate(invoice.paid_at || invoice.updated_at)}</div>}
        <div className="text-xs text-green-600">Method: {invoice.payment_method || "Bank Transfer"}</div>
        {amountPaid > 0 && <div className="text-xs text-green-600">Amount: {money(amountPaid)}</div>}
        {(invoice.order_id || invoice.linked_order_id) && (
          <a href={`/account/orders/${invoice.order_id || invoice.linked_order_id}`} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-green-600 text-white px-4 py-2 text-xs font-semibold hover:bg-green-700 transition-colors" data-testid="track-order-cta">
            Track Order
          </a>
        )}
      </div>
    );
  }

  if (isApproved) {
    return (
      <div className="rounded-xl border border-teal-200 p-4 bg-teal-50/50" data-testid="payment-status-block">
        <div className="text-xs uppercase tracking-wide text-teal-600 mb-2 font-semibold">Payment Status</div>
        <div className="font-bold text-teal-700 text-sm">Approved Payment</div>
        {amountPaid > 0 && (
          <div className="text-xs text-teal-600 mt-1">Amount: {money(amountPaid)}</div>
        )}
        {(invoice.order_id || invoice.linked_order_id) && (
          <a href={`/account/orders/${invoice.order_id || invoice.linked_order_id}`} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 text-white px-4 py-2 text-xs font-semibold hover:bg-teal-700 transition-colors" data-testid="track-order-cta">
            Track Order
          </a>
        )}
      </div>
    );
  }

  if (isUnderReview && !["proof_rejected", "rejected", "payment_rejected"].includes(s)) {
    return (
      <div className="rounded-xl border border-blue-200 p-4 bg-blue-50/50" data-testid="payment-status-block">
        <div className="text-xs uppercase tracking-wide text-blue-600 mb-2 font-semibold">Payment Status</div>
        <div className="font-bold text-blue-700 text-sm">Payment Under Review</div>
        {amountPaid > 0 && (
          <div className="text-xs text-blue-600 mt-1">Paid so far: {money(amountPaid)}</div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 p-4 bg-amber-50/50" data-testid="payment-status-block">
      <div className="text-xs uppercase tracking-wide text-amber-600 mb-2 font-semibold">Payment Status</div>
      <div className="font-bold text-amber-700 text-sm">Awaiting Payment</div>
      {amountPaid > 0 && (
        <div className="text-xs text-amber-600 mt-1">Paid so far: {money(amountPaid)}</div>
      )}
      {bankInfo && bankInfo.bank_name && (
        <div className="mt-3 space-y-1 text-xs text-slate-600 border-t border-amber-200 pt-2">
          <div className="flex gap-2"><Building2 className="w-3 h-3 mt-0.5 text-slate-400 shrink-0" /><span><strong>Bank:</strong> {bankInfo.bank_name}</span></div>
          <div><strong>Account:</strong> {bankInfo.account_name}</div>
          <div><strong>Number:</strong> {bankInfo.account_number}</div>
          {bankInfo.branch && <div><strong>Branch:</strong> {bankInfo.branch}</div>}
          {bankInfo.swift_code && <div><strong>SWIFT:</strong> {bankInfo.swift_code}</div>}
        </div>
      )}
    </div>
  );
}

function InvoiceDrawer({ invoice, onClose, bankInfo, branding, onPaymentSuccess }) {
  const [paymentLoading, setPaymentLoading] = useState(false);

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

  const handleStripePayment = async () => {
    setPaymentLoading(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("konekt_token");
      const originUrl = window.location.origin;
      const res = await axios.post(
        `${API_URL}/api/payments/stripe/checkout/invoice`,
        { invoice_id: invoice.id || invoice._id, origin_url: originUrl },
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
      );
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      const msg = err.response?.data?.detail || "Payment initiation failed";
      alert(msg);
    } finally {
      setPaymentLoading(false);
    }
  };

  const billing = invoice.billing || {};
  const billingName = billing.invoice_client_name || invoice.customer_name || invoice.customer_email || "Customer";
  const billingEmail = billing.invoice_client_email || invoice.customer_email || "";
  const billingPhone = billing.invoice_client_phone || invoice.customer_phone || "";
  const billingTin = billing.invoice_client_tin || "";

  return (
    <StandardDrawerShell
      open={!!invoice}
      onClose={onClose}
      title="Invoice Preview"
      subtitle={invoice.invoice_number || invoice.id || ""}
      width="xl"
      testId="invoice-drawer"
      badge={<span className={`text-xs px-3 py-1 rounded-full font-semibold ${status.cls}`}>{status.label}</span>}
      footer={
        <div className="flex items-center gap-3">
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
              onClick={handleStripePayment}
              disabled={paymentLoading}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors ${action.cls} disabled:opacity-50`}
              data-testid="pay-invoice-btn"
            >
              {paymentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              {paymentLoading ? "Redirecting..." : action.label}
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
      }
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between text-sm">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Date</div>
            <div className="font-semibold text-[#20364D]">{fmtDate(invoice.created_at)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Type</div>
            <div className="font-semibold text-[#20364D] capitalize">{invoice.type || invoice.source_type || "product"}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2 font-semibold">Bill To</div>
            <div className="font-semibold text-[#20364D] text-sm">{billingName}</div>
            {billingEmail && <div className="text-xs text-slate-500 mt-1">{billingEmail}</div>}
            {billingPhone && <div className="text-xs text-slate-500">{billingPhone}</div>}
            {billingTin && <div className="text-xs text-slate-500">TIN: {billingTin}</div>}
          </div>
          <PaymentStatusBlock invoice={invoice} bankInfo={bankInfo} />
        </div>

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

        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
          <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-medium text-[#20364D]">{money(subtotal)}</span></div>
          <div className="flex items-center justify-between text-sm"><span className="text-slate-500">VAT</span><span className="font-medium text-[#20364D]">{money(vat)}</span></div>
          {amountPaid > 0 && <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Paid</span><span className="font-medium text-green-700">-{money(amountPaid)}</span></div>}
          <div className="flex items-center justify-between text-base pt-2 border-t border-slate-200">
            <span className="font-semibold text-[#20364D]">{amountPaid > 0 ? "Balance Due" : "Total"}</span>
            <span className="font-bold text-[#20364D]">{money(amountPaid > 0 ? balanceDue : total)}</span>
          </div>
        </div>

        {(invoice.rejection_reason || ["proof_rejected", "rejected", "payment_rejected"].includes(invoice.payment_status)) && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold text-red-700 text-sm">Payment Rejected</div>
              <div className="text-sm text-red-600 mt-1">{invoice.rejection_reason || "Please submit a corrected payment proof."}</div>
            </div>
          </div>
        )}

        {isPaid(invoice) && branding && (branding.show_signature || branding.show_stamp) && (
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/30 flex gap-6" data-testid="branding-preview">
            {branding.show_signature && (
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-2 font-semibold">Authorized by</div>
                {branding.cfo_signature_url ? (
                  <img src={`${API_URL}${branding.cfo_signature_url}`} alt="Signature" className="h-8 object-contain mb-1 opacity-60" />
                ) : (
                  <div className="h-8 border-b border-slate-300 mb-1" />
                )}
                <div className="text-xs font-semibold text-[#20364D]">{branding.cfo_name || "CFO"}</div>
                <div className="text-[10px] text-slate-400">{branding.cfo_title || "Chief Finance Officer"}</div>
              </div>
            )}
            {branding.show_stamp && (
              <div className="flex-1 flex flex-col items-center">
                <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-2 font-semibold">Company Stamp</div>
                {branding.stamp_uploaded_url ? (
                  <img src={`${API_URL}${branding.stamp_uploaded_url}`} alt="Stamp" className="w-14 h-14 object-contain opacity-50" />
                ) : branding.stamp_preview_url ? (
                  <img src={`${API_URL}${branding.stamp_preview_url}`} alt="Stamp" className="w-14 h-14 object-contain opacity-50" />
                ) : (
                  <div className="w-14 h-14 border border-dashed border-slate-200 rounded-full" />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </StandardDrawerShell>
  );
}

export default function InvoicesPageV2() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [bankInfo, setBankInfo] = useState(null);
  const [branding, setBranding] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState(null);

  const loadInvoices = useCallback(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("konekt_token");
    if (!token) return;
    axios.get(`${API_URL}/api/customer/invoices`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const sorted = (res.data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setInvoices(sorted);
      })
      .catch((err) => console.error("Failed to load invoices:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadInvoices();
    axios.get(`${API_URL}/api/public/payment-info`).then(r => setBankInfo(r.data)).catch(() => {});
    axios.get(`${API_URL}/api/admin/settings/invoice-branding`).then(r => setBranding(r.data)).catch(() => {});
  }, [loadInvoices]);

  // Handle Stripe payment return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const paymentStatus = params.get("payment");

    if (paymentStatus === "cancelled") {
      setPaymentMessage({ type: "warning", text: "Payment was cancelled. You can try again from your invoice." });
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (sessionId) {
      setPaymentMessage({ type: "info", text: "Verifying your payment..." });
      let attempts = 0;
      const maxAttempts = 8;
      const poll = async () => {
        try {
          const res = await axios.get(`${API_URL}/api/payments/stripe/checkout/status/${sessionId}`);
          if (res.data.payment_status === "paid") {
            setPaymentMessage({ type: "success", text: "Payment successful! Your invoice has been updated." });
            loadInvoices();
            window.history.replaceState({}, "", window.location.pathname);
            return;
          }
          if (res.data.status === "expired") {
            setPaymentMessage({ type: "error", text: "Payment session expired. Please try again." });
            window.history.replaceState({}, "", window.location.pathname);
            return;
          }
        } catch (e) { /* continue polling */ }
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2500);
        } else {
          setPaymentMessage({ type: "info", text: "Payment is being processed. Please check back shortly." });
          window.history.replaceState({}, "", window.location.pathname);
        }
      };
      poll();
    }
  }, [loadInvoices]);

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

      {paymentMessage && (
        <div
          data-testid="payment-message-banner"
          className={`rounded-xl px-5 py-3 text-sm font-medium flex items-center gap-3 ${
            paymentMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" :
            paymentMessage.type === "error" ? "bg-red-50 text-red-700 border border-red-200" :
            paymentMessage.type === "warning" ? "bg-amber-50 text-amber-700 border border-amber-200" :
            "bg-blue-50 text-blue-700 border border-blue-200"
          }`}
        >
          {paymentMessage.type === "info" && <Loader2 className="w-4 h-4 animate-spin" />}
          {paymentMessage.text}
          <button onClick={() => setPaymentMessage(null)} className="ml-auto text-current opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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

      {/* ─── MOBILE: Card Layout ─── */}
      <div className="md:hidden space-y-3" data-testid="invoices-mobile-cards">
        {loading ? (
          <div className="text-center text-slate-400 py-10">Loading invoices...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center text-slate-400 py-10 bg-white rounded-2xl border">No invoices found.</div>
        ) : filteredInvoices.map((invoice) => {
          const st = statusMeta(invoice);
          const action = getActionConfig(invoice);
          return (
            <div key={invoice.id || invoice._id} className="bg-white rounded-2xl border p-4 active:bg-slate-50 transition" onClick={() => setSelectedInvoice(invoice)} data-testid={`invoice-card-${invoice.id}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-sm font-bold text-[#20364D]">{invoice.invoice_number || invoice.id}</div>
                  <div className="text-xs text-slate-500">{fmtDate(invoice.created_at)} &middot; {invoice.type || "product"}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{invoice.payment_status_label || st.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-base font-bold text-[#20364D]">{money(invoice.total_amount || invoice.total)}</div>
                {action && (
                  <button className={`text-xs px-3 py-2 rounded-xl font-semibold ${action.cls}`} onClick={(e) => e.stopPropagation()} data-testid={`invoice-action-mobile-${invoice.id}`}>
                    {action.label}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── DESKTOP: Table Layout ─── */}
      <div className="hidden md:block rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="invoices-table">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-left">Invoice No</th>
                <th className="px-6 py-4 text-left">Type</th>
                <th className="px-6 py-4 text-left">Amount</th>
                <th className="px-6 py-4 text-left">Payer Name</th>
                <th className="px-6 py-4 text-left">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400">Loading invoices...</td></tr>
              ) : filteredInvoices.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400">No invoices found.</td></tr>
              ) : filteredInvoices.map((invoice) => {
                const st = statusMeta(invoice);
                const payerName = safeDisplay(invoice.payer_name || (invoice.billing || {}).invoice_client_name || invoice.customer_name, "person");
                return (
                  <tr key={invoice.id || invoice._id} className="hover:bg-slate-50/70 cursor-pointer transition-colors" onClick={() => setSelectedInvoice(invoice)} data-testid={`invoice-row-${invoice.id}`}>
                    <td className="px-6 py-4 text-[#20364D]">{fmtDate(invoice.created_at)}</td>
                    <td className="px-6 py-4 font-semibold text-[#20364D]">{invoice.invoice_number || invoice.id}</td>
                    <td className="px-6 py-4 text-slate-600 capitalize">{invoice.type || invoice.source_type || "product"}</td>
                    <td className="px-6 py-4 font-semibold text-[#20364D]">{money(invoice.total_amount || invoice.total)}</td>
                    <td className="px-6 py-4 text-slate-600">{payerName}</td>
                    <td className="px-6 py-4"><span className={`text-xs px-3 py-1 rounded-full font-medium ${st.cls}`}>{invoice.payment_status_label || st.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <InvoiceDrawer invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} bankInfo={bankInfo} branding={branding} onPaymentSuccess={loadInvoices} />
    </div>
  );
}
