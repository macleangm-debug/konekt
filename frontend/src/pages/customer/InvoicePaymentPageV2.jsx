import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import PaymentMethodOption from "../../components/payments/PaymentMethodOption";
import PaymentTimeline from "../../components/payments/PaymentTimeline";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";

export default function InvoicePaymentPageV2() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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
        // Try multiple invoice endpoints
        let invoiceData = null;
        
        try {
          const res = await api.get(`/api/invoices/${invoiceId}`);
          invoiceData = res.data;
        } catch (err) {
          // Try customer invoice endpoint
          try {
            const res = await api.get(`/api/customer/invoices/${invoiceId}`);
            invoiceData = res.data;
          } catch (err2) {
            console.log("Invoice not found in either endpoint");
          }
        }

        if (invoiceData) {
          setInvoice({
            id: invoiceData._id || invoiceData.id || invoiceId,
            invoice_number: invoiceData.invoice_number || `INV-${invoiceId.slice(-6).toUpperCase()}`,
            customer_name: invoiceData.customer_name || invoiceData.customer_email || "Customer",
            customer_email: invoiceData.customer_email,
            currency: invoiceData.currency || "TZS",
            amount_due: invoiceData.amount_due || invoiceData.total || invoiceData.total_amount || 0,
            status: invoiceData.status || "issued",
          });
          setForm(prev => ({
            ...prev,
            amount_paid: String(invoiceData.amount_due || invoiceData.total || invoiceData.total_amount || ""),
          }));
          
          // Fetch payment timeline events
          try {
            const timelineRes = await api.get(`/api/payment-timeline/invoice/${invoiceId}`);
            if (timelineRes.data?.events) {
              setTimelineEvents(timelineRes.data.events);
            }
          } catch (err) {
            console.log("Payment timeline not available for this invoice");
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
        <PageHeader
          title="Invoice Not Found"
          subtitle="We couldn't find the invoice you're looking for."
        />
        <SurfaceCard className="text-center py-12">
          <p className="text-slate-600 mb-6">The invoice may have been removed or you may not have access to it.</p>
          <Link 
            to="/dashboard/invoices" 
            className="inline-flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Invoices
          </Link>
        </SurfaceCard>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="space-y-8" data-testid="payment-submitted">
        <PageHeader
          title="Payment Proof Submitted"
          subtitle={`Your payment proof for invoice ${invoice.invoice_number} has been received.`}
        />
        <SurfaceCard className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#20364D] mb-3">Thank You!</h2>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            Our finance team will verify your payment and update the invoice status. 
            You'll receive a notification once it's confirmed.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link 
              to="/dashboard/invoices"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold"
            >
              View All Invoices
            </Link>
            <Link 
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 font-semibold text-[#20364D]"
            >
              Go to Dashboard
            </Link>
          </div>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="invoice-payment-page-v2">
      <PageHeader
        title="Invoice Payment"
        subtitle="Pay this invoice using bank transfer and upload proof. No manual invoice ID entry needed."
        actions={
          <Link 
            to="/dashboard/invoices"
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-medium text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Invoices
          </Link>
        }
      />

      {/* Invoice & Bank Details Panel */}
      <div className="rounded-[2rem] border bg-white p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="text-3xl font-bold text-[#20364D]">Pay Invoice</div>
            <p className="text-slate-600 mt-3">
              This payment flow is tied directly to invoice <strong>{invoice.invoice_number}</strong>. No manual invoice ID entry is needed.
            </p>
          </div>

          <div className="rounded-2xl bg-[#F4E7BF] text-[#8B6A10] px-4 py-2 text-sm font-semibold whitespace-nowrap">
            Bank Transfer Only
          </div>
        </div>

        <div className="grid xl:grid-cols-[1fr_0.95fr] gap-6 mt-8">
          {/* Invoice Summary */}
          <div className="rounded-3xl bg-slate-50 p-6">
            <div className="text-xl font-bold text-[#20364D]">Invoice summary</div>
            <div className="space-y-3 mt-5 text-slate-700">
              <div><strong>Invoice:</strong> {invoice.invoice_number}</div>
              <div><strong>Customer:</strong> {invoice.customer_name}</div>
              <div><strong>Amount Due:</strong> {invoice.currency} {Number(invoice.amount_due || 0).toLocaleString()}</div>
              <div><strong>Status:</strong> <span className="capitalize">{invoice.status}</span></div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="rounded-3xl border bg-white p-6">
            <div className="text-xl font-bold text-[#20364D]">Bank transfer details (Tanzania)</div>
            <div className="space-y-3 mt-5 text-slate-700">
              <div><strong>Account Name:</strong> KONEKT LIMITED</div>
              <div><strong>Account Number:</strong> 015C8841347002</div>
              <div><strong>Bank:</strong> CRDB BANK</div>
              <div><strong>SWIFT:</strong> CORUTZTZ</div>
            </div>

            <div className="rounded-2xl border bg-slate-50 px-4 py-4 mt-6 text-sm text-slate-600">
              Please make payment using the details above and include your invoice number as the payment reference.
              After payment, upload your proof so our finance team can verify it quickly.
            </div>

            <button
              type="button"
              onClick={() => setShowUpload(true)}
              data-testid="upload-proof-btn"
              className="mt-6 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#17283c] transition"
            >
              Upload Payment Proof
            </button>
          </div>
        </div>
      </div>

      {/* Payment Timeline */}
      <SurfaceCard>
        <div className="text-lg font-bold text-[#20364D] mb-4">Payment Progress</div>
        <p className="text-slate-600 text-sm mb-6">
          Track your payment status from invoice issuance to order fulfillment.
        </p>
        <PaymentTimeline 
          events={timelineEvents} 
          currentStatus={invoice?.status === "paid" ? "confirmed" : (timelineEvents.length > 0 ? undefined : "issued")}
        />
      </SurfaceCard>

      {/* Payment Methods Overview */}
      <SurfaceCard>
        <div className="text-lg font-bold text-[#20364D] mb-4">Available Payment Methods</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <PaymentMethodOption
            label="Bank Transfer"
            description="Direct bank deposit or wire transfer"
            active
            selected
            data-testid="payment-bank-active"
          />
          <PaymentMethodOption
            label="Mobile Money"
            description="M-Pesa, Tigo Pesa, Airtel Money"
            disabled
            data-testid="payment-mobile-disabled"
          />
          <PaymentMethodOption
            label="Card Payment"
            description="Visa, Mastercard"
            disabled
            data-testid="payment-card-disabled"
          />
          <PaymentMethodOption
            label="KwikPay"
            description="Online gateway"
            disabled
            data-testid="payment-kwikpay-disabled"
          />
        </div>
      </SurfaceCard>

      {/* Upload Form */}
      {showUpload && (
        <form onSubmit={submitProof} className="rounded-[2rem] border bg-white p-8" data-testid="upload-proof-form">
          <div className="text-2xl font-bold text-[#20364D]">Upload Payment Proof</div>
          <p className="text-slate-600 mt-2">
            Provide the details of your bank transfer so we can match it to this invoice.
          </p>
          
          <div className="grid gap-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount Paid *</label>
              <input 
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                placeholder="Amount paid" 
                type="number"
                step="0.01"
                value={form.amount_paid} 
                onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
                data-testid="amount-paid-input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date *</label>
              <input 
                type="date" 
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                value={form.payment_date} 
                onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                data-testid="payment-date-input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Transaction Reference *</label>
              <input 
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                placeholder="Bank transaction reference number" 
                value={form.transaction_reference} 
                onChange={(e) => setForm({ ...form, transaction_reference: e.target.value })}
                data-testid="transaction-ref-input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Proof File URL (optional)</label>
              <input 
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                placeholder="Link to screenshot or receipt (optional)" 
                value={form.proof_url} 
                onChange={(e) => setForm({ ...form, proof_url: e.target.value })}
                data-testid="proof-url-input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Note (optional)</label>
              <textarea 
                className="w-full border rounded-xl px-4 py-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
                placeholder="Any additional information about the payment" 
                value={form.note} 
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                data-testid="note-input"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button 
              type="submit" 
              disabled={submitting}
              data-testid="submit-proof-btn"
              className="rounded-xl bg-[#D4A843] text-[#17283C] px-5 py-3 font-semibold hover:bg-[#c49a3d] transition disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Proof"}
            </button>
            <button 
              type="button"
              onClick={() => setShowUpload(false)}
              className="rounded-xl border px-5 py-3 font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
