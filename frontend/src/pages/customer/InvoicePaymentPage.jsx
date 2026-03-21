import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import InvoicePaymentPanel from "../../components/payments/InvoicePaymentPanel";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function InvoicePaymentPage() {
  const { invoiceId } = useParams();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState(null);
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
    const fetchInvoice = async () => {
      if (!invoiceId) {
        setLoading(false);
        return;
      }
      
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/api/invoices/${invoiceId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        
        if (!res.ok) throw new Error("Invoice not found");
        
        const data = await res.json();
        setInvoice({
          id: data._id || data.id || invoiceId,
          invoice_number: data.invoice_number || `INV-${invoiceId.slice(-6).toUpperCase()}`,
          customer_name: data.customer_name || user?.company_name || user?.full_name || "Customer",
          currency: data.currency || "TZS",
          amount_due: data.total_amount || data.amount_due || 0,
          status: data.status || "issued",
        });
        
        // Prefill amount
        setForm(prev => ({
          ...prev,
          amount_paid: String(data.total_amount || data.amount_due || ""),
        }));
      } catch (err) {
        console.error("Failed to fetch invoice:", err);
        toast.error("Could not load invoice details");
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvoice();
  }, [invoiceId, user]);

  const submitProof = async (e) => {
    e.preventDefault();
    
    if (!form.amount_paid || !form.transaction_reference) {
      toast.error("Please fill in amount paid and transaction reference");
      return;
    }
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/invoice-payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          invoice_id: invoiceId,
          amount_paid: parseFloat(form.amount_paid),
          payment_date: form.payment_date,
          transaction_reference: form.transaction_reference,
          proof_url: form.proof_url,
          note: form.note,
          payment_method: "bank_transfer",
        }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to submit payment proof");
      }
      
      setSubmitted(true);
      toast.success("Payment proof submitted successfully! Our finance team will verify it.");
    } catch (err) {
      toast.error(err.message || "Failed to submit payment proof");
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
        <div className="rounded-[2rem] border bg-white p-8 text-center">
          <p className="text-slate-600 mb-6">The invoice may have been removed or you may not have access to it.</p>
          <Link 
            to="/dashboard/invoices" 
            className="inline-flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Invoices
          </Link>
        </div>
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
        <div className="rounded-[2rem] border bg-white p-8 text-center">
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
              to={`/dashboard/invoices`}
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="invoice-payment-page">
      <PageHeader
        title="Invoice Payment"
        subtitle="Pay this invoice using bank transfer and upload proof without entering an invoice ID manually."
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

      <InvoicePaymentPanel
        invoice={invoice}
        onUploadProof={() => setShowUpload(true)}
      />

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
              <p className="text-xs text-slate-500 mt-1">You can upload to a file sharing service and paste the link here</p>
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
