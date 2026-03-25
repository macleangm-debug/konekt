import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, Loader2, Layers } from "lucide-react";

function money(v, c = "TZS") { return `${c} ${Number(v || 0).toLocaleString()}`; }

export default function InvoicePaymentPageV2() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [splits, setSplits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedSplit, setSelectedSplit] = useState(null);
  const [form, setForm] = useState({
    amount_paid: "",
    payment_date: new Date().toISOString().split('T')[0],
    transaction_reference: "",
    proof_url: "",
    note: "",
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let invoiceData = null;

        // Try customer invoice endpoint first, then fallback
        try {
          const res = await api.get(`/api/customer/invoices/${invoiceId}`);
          invoiceData = res.data;
        } catch {
          try {
            const res = await api.get(`/api/invoices/${invoiceId}`);
            invoiceData = res.data;
          } catch {
            console.log("Invoice not found");
          }
        }

        if (invoiceData) {
          const amountDue = invoiceData.amount_due || invoiceData.total || invoiceData.total_amount || 0;
          setInvoice({
            id: invoiceData.id || invoiceData._id || invoiceId,
            invoice_number: invoiceData.invoice_number || `INV-${invoiceId.slice(-6).toUpperCase()}`,
            customer_name: invoiceData.customer_name || invoiceData.customer_email || "Customer",
            customer_email: invoiceData.customer_email,
            currency: invoiceData.currency || "TZS",
            total: invoiceData.total || invoiceData.total_amount || 0,
            amount_due: amountDue,
            status: invoiceData.status || "issued",
            payment_status: invoiceData.payment_status || invoiceData.status,
            has_installments: invoiceData.has_installments || false,
            deposit_amount: invoiceData.deposit_amount || 0,
            balance_amount: invoiceData.balance_amount || 0,
            payment_type: invoiceData.payment_type || "full",
          });

          // Load splits
          const invoiceSplits = invoiceData.splits || [];
          if (invoiceSplits.length > 0) {
            setSplits(invoiceSplits);
          } else if (invoiceData.has_installments) {
            try {
              const splitsRes = await api.get(`/api/customer/invoices/${invoiceData.id || invoiceId}/splits`);
              setSplits(splitsRes.data || []);
            } catch {
              // Try quote engine endpoint
              try {
                const splitsRes = await api.get(`/api/quotes-engine/invoice/${invoiceData.id || invoiceId}/splits`);
                setSplits(splitsRes.data || []);
              } catch {
                console.log("No splits found");
              }
            }
          }

          // Set default amount
          const pendingSplit = invoiceSplits.find(s => s.status === "pending" && s.type === "deposit") ||
                               invoiceSplits.find(s => s.status === "pending");
          setForm(prev => ({
            ...prev,
            amount_paid: String(pendingSplit?.amount || amountDue || ""),
          }));
          if (pendingSplit) {
            setSelectedSplit(pendingSplit);
          }
        }
      } catch (err) {
        console.error("Failed to fetch invoice:", err);
        toast.error("Could not load invoice details");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [invoiceId]);

  const submitProof = async (e) => {
    e.preventDefault();
    if (!form.amount_paid || !form.transaction_reference) {
      toast.error("Please fill in amount paid and transaction reference");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/payment-proofs/submit", {
        invoice_id: invoice?.id || invoiceId,
        invoice_number: invoice?.invoice_number,
        amount_paid: Number(form.amount_paid || 0),
        payment_date: form.payment_date,
        transaction_reference: form.transaction_reference,
        proof_url: form.proof_url,
        note: form.note,
        payment_method: "bank_transfer",
        split_id: selectedSplit?.id || undefined,
        split_type: selectedSplit?.type || undefined,
      });
      setSubmitted(true);
      toast.success("Payment proof submitted! Our finance team will verify it.");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to submit payment proof");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="invoice-payment-loading">
        <Loader2 className="w-8 h-8 animate-spin text-[#20364D]" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-8" data-testid="invoice-not-found">
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-[#20364D]">Invoice Not Found</h1>
          <p className="text-slate-500 mt-1 text-sm">We couldn't find the invoice you're looking for.</p>
        </div>
        <div className="rounded-[2rem] border bg-white p-8 text-center">
          <p className="text-slate-600 mb-6">The invoice may have been removed or you may not have access to it.</p>
          <Link to="/dashboard/invoices" className="inline-flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back to Invoices
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="space-y-8" data-testid="payment-submitted">
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-[#20364D]">Payment Proof Submitted</h1>
          <p className="text-slate-500 mt-1 text-sm">Your payment for {invoice.invoice_number} has been received.</p>
        </div>
        <div className="rounded-[2rem] border bg-white p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#20364D] mb-3">Thank You!</h2>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            Our finance team will verify your payment and update the invoice status.
            {selectedSplit && ` This payment is for the ${selectedSplit.type} portion.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/dashboard/invoices" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold">
              View All Invoices
            </Link>
            <Link to="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 font-semibold text-[#20364D]">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const pendingDeposit = splits.find(s => s.type === "deposit" && s.status === "pending");
  const pendingBalance = splits.find(s => s.type === "balance" && s.status === "pending");

  return (
    <div className="space-y-8" data-testid="invoice-payment-page-v2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">Invoice Payment</h1>
          <p className="text-slate-500 mt-1 text-sm">Pay invoice {invoice.invoice_number} using bank transfer.</p>
        </div>
        <Link to="/dashboard/invoices" className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-medium text-slate-600 hover:bg-slate-50">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>

      {/* Invoice & Bank Details */}
      <div className="rounded-[2rem] border bg-white p-8">
        <div className="grid xl:grid-cols-2 gap-6">
          {/* Invoice Summary */}
          <div className="rounded-2xl bg-slate-50 p-6">
            <div className="text-xl font-bold text-[#20364D] mb-4">Invoice Summary</div>
            <div className="space-y-3 text-slate-700 text-sm">
              <div className="flex justify-between"><span>Invoice:</span><span className="font-semibold">{invoice.invoice_number}</span></div>
              <div className="flex justify-between"><span>Customer:</span><span className="font-semibold">{invoice.customer_name}</span></div>
              <div className="flex justify-between"><span>Total:</span><span className="font-semibold">{money(invoice.total, invoice.currency)}</span></div>
              <div className="flex justify-between"><span>Status:</span><span className="font-semibold capitalize">{invoice.payment_status || invoice.status}</span></div>
            </div>

            {/* Installment Splits */}
            {splits.length > 0 && (
              <div className="mt-5 pt-4 border-t" data-testid="payment-splits-section">
                <div className="flex items-center gap-2 text-amber-800 text-sm font-semibold mb-3">
                  <Layers className="w-4 h-4" /> Installment Breakdown
                </div>
                <div className="space-y-2">
                  {splits.map((split) => (
                    <button key={split.id} onClick={() => {
                      setSelectedSplit(split);
                      setForm(prev => ({ ...prev, amount_paid: String(split.amount) }));
                    }}
                    disabled={split.status === "paid"}
                    className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm border transition
                      ${split.status === "paid" ? "bg-green-50 border-green-200 text-green-700 cursor-default" :
                        selectedSplit?.id === split.id ? "bg-amber-50 border-amber-300 ring-2 ring-amber-300" :
                        "bg-white border-slate-200 hover:border-amber-300 cursor-pointer"}`}
                    data-testid={`split-${split.type}`}>
                      <span className="capitalize font-medium">{split.type}</span>
                      <div className="text-right">
                        <span className="font-semibold">{money(split.amount, invoice.currency)}</span>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${split.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                          {split.status === "paid" ? "Paid" : "Pending"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                {selectedSplit && (
                  <p className="text-xs text-amber-700 mt-2">
                    You are paying the <strong className="capitalize">{selectedSplit.type}</strong> of {money(selectedSplit.amount, invoice.currency)}
                  </p>
                )}
              </div>
            )}

            {!splits.length && invoice.has_installments && (
              <div className="mt-4 pt-3 border-t text-sm text-amber-700">
                <div className="flex items-center gap-2 font-semibold mb-1"><Layers className="w-4 h-4" /> Installment Payment</div>
                <p>Deposit: {money(invoice.deposit_amount)} | Balance: {money(invoice.balance_amount)}</p>
                <p className="font-semibold mt-1">Amount Due Now: {money(invoice.amount_due)}</p>
              </div>
            )}
          </div>

          {/* Bank Details */}
          <div className="rounded-2xl border bg-white p-6">
            <div className="text-xl font-bold text-[#20364D] mb-4">Bank Transfer Details</div>
            <div className="space-y-3 text-slate-700 text-sm">
              <div><strong>Account Name:</strong> KONEKT LIMITED</div>
              <div><strong>Account Number:</strong> 015C8841347002</div>
              <div><strong>Bank:</strong> CRDB BANK</div>
              <div><strong>SWIFT:</strong> CORUTZTZ</div>
            </div>
            <div className="rounded-xl border bg-slate-50 px-4 py-3 mt-5 text-sm text-slate-600">
              Include your invoice number as the payment reference. After payment, upload proof below.
            </div>
            <button type="button" onClick={() => setShowUpload(true)} data-testid="upload-proof-btn"
              className="mt-5 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#17283c] transition w-full">
              Upload Payment Proof
            </button>
          </div>
        </div>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <form onSubmit={submitProof} className="rounded-[2rem] border bg-white p-8" data-testid="upload-proof-form">
          <div className="text-2xl font-bold text-[#20364D]">Upload Payment Proof</div>
          <p className="text-slate-600 mt-2">Provide the details of your bank transfer.</p>
          {selectedSplit && (
            <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              Paying <strong className="capitalize">{selectedSplit.type}</strong>: {money(selectedSplit.amount, invoice.currency)}
            </div>
          )}
          <div className="grid gap-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount Paid *</label>
              <input className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                placeholder="Amount paid" type="number" step="0.01"
                value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
                data-testid="amount-paid-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date *</label>
              <input type="date" className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                data-testid="payment-date-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Transaction Reference *</label>
              <input className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                placeholder="Bank transaction reference number"
                value={form.transaction_reference} onChange={(e) => setForm({ ...form, transaction_reference: e.target.value })}
                data-testid="transaction-ref-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Proof File URL (optional)</label>
              <input className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                placeholder="Link to screenshot or receipt" value={form.proof_url}
                onChange={(e) => setForm({ ...form, proof_url: e.target.value })} data-testid="proof-url-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Note (optional)</label>
              <textarea className="w-full border rounded-xl px-4 py-3 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                placeholder="Any additional information" value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })} data-testid="note-input" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button type="submit" disabled={submitting} data-testid="submit-proof-btn"
              className="rounded-xl bg-[#D4A843] text-[#17283C] px-5 py-3 font-semibold hover:bg-[#c49a3d] transition disabled:opacity-50">
              {submitting ? "Submitting..." : "Submit Proof"}
            </button>
            <button type="button" onClick={() => setShowUpload(false)}
              className="rounded-xl border px-5 py-3 font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
