import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Upload, CheckCircle2, Loader2, ArrowLeft,
  FileText, LogIn, UserPlus, AlertCircle
} from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PublicPaymentProofPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get("order") || "";
  const prefillEmail = searchParams.get("email") || "";

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    order_number: orderNumber,
    email: prefillEmail,
    payer_name: "",
    amount_paid: "",
    payment_method: "bank_transfer",
    payment_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.order_number || !form.email) return toast.error("Order number and email are required.");
    if (!form.amount_paid) return toast.error("Please enter the amount paid.");
    if (!form.payer_name) return toast.error("Please enter the payer name.");

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/public/payment-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount_paid: parseFloat(form.amount_paid),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Submission failed");

      setResult(data);
      toast.success("Payment proof submitted successfully!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Success State ────────────────────────────────────
  if (result) {
    const acc = result.account_info || {};
    return (
      <div className="max-w-2xl mx-auto px-6 py-16" data-testid="payment-proof-success">
        <div className="rounded-2xl bg-white border p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#20364D]">Payment Proof Submitted</h1>
          <p className="text-slate-600 mt-2">
            Order <span className="font-semibold">{result.order_number}</span>
          </p>
          <p className="text-slate-500 mt-1 text-sm">{result.message}</p>

          {/* Account CTA — peak motivation moment */}
          {acc.type && (
            <div className="mt-6 rounded-xl bg-gradient-to-r from-[#0E1A2B] to-[#20364D] p-6 text-left text-white" data-testid="account-cta-after-payment">
              <p className="font-bold text-lg">{acc.message}</p>
              <ul className="text-sm text-slate-200 mt-2 space-y-1">
                <li>Track status updates</li>
                <li>View invoices and payments</li>
                <li>Reorder faster next time</li>
              </ul>
              <div className="mt-4">
                {acc.type === "login" ? (
                  <button
                    onClick={() => navigate("/login")}
                    className="flex items-center gap-2 rounded-xl bg-[#D4A843] text-[#17283C] px-5 py-2.5 font-semibold hover:bg-[#c49a3d] transition"
                    data-testid="login-btn"
                  >
                    <LogIn className="w-4 h-4" /> Log In to Track Order
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(acc.invite_url || "/login")}
                    className="flex items-center gap-2 rounded-xl bg-[#D4A843] text-[#17283C] px-5 py-2.5 font-semibold hover:bg-[#c49a3d] transition"
                    data-testid="create-account-btn"
                  >
                    <UserPlus className="w-4 h-4" /> Create Account to Track Order
                  </button>
                )}
              </div>
            </div>
          )}

          <button
            onClick={() => navigate("/marketplace")}
            className="mt-5 rounded-xl border px-6 py-3 font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Continue Browsing
          </button>
        </div>
      </div>
    );
  }

  // ─── Payment Proof Form ────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-6 py-10" data-testid="payment-proof-page">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#20364D] mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <section className="rounded-2xl bg-gradient-to-r from-[#0E1A2B] to-[#20364D] text-white p-7 mb-7">
        <div className="text-xs tracking-[0.2em] uppercase text-slate-300 font-semibold">Payment</div>
        <h1 className="text-3xl font-bold mt-3">Upload Payment Proof</h1>
        <p className="text-slate-200 mt-2 max-w-xl">
          After transferring payment, submit your proof below. Our team will verify and process your order.
        </p>
      </section>

      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-6 flex items-start gap-3" data-testid="payment-instruction">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <strong>Use your order number as payment reference.</strong>
          <p className="mt-1">Include the bank transfer receipt number or screenshot reference for faster verification.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl bg-white border p-7 space-y-6" data-testid="payment-proof-form">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5"><FileText className="w-3.5 h-3.5 inline mr-1" />Order Number *</label>
            <input type="text" value={form.order_number} onChange={e => set("order_number", e.target.value)}
              className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
              placeholder="ORD-20260406-XXXXXX" required data-testid="pp-order-number" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email (used at checkout) *</label>
            <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
              className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
              placeholder="you@company.com" required data-testid="pp-email" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Payer Name *</label>
            <input type="text" value={form.payer_name} onChange={e => set("payer_name", e.target.value)}
              className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
              placeholder="Name on the bank transfer" required data-testid="pp-payer-name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount Paid (TZS) *</label>
            <input type="number" step="0.01" value={form.amount_paid} onChange={e => set("amount_paid", e.target.value)}
              className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
              placeholder="50000" required data-testid="pp-amount" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Date</label>
            <input type="date" value={form.payment_date} onChange={e => set("payment_date", e.target.value)}
              className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
              data-testid="pp-date" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Method</label>
          <select value={form.payment_method} onChange={e => set("payment_method", e.target.value)}
            className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
            data-testid="pp-method">
            <option value="bank_transfer">Bank Transfer</option>
            <option value="mobile_money">Mobile Money (M-Pesa, Tigo Pesa)</option>
            <option value="cheque">Cheque</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Additional Notes</label>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
            className="w-full border rounded-xl px-4 py-2.5 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
            placeholder="Any additional details..." data-testid="pp-notes" />
        </div>

        <button type="submit" disabled={submitting}
          className="w-full rounded-xl bg-[#D4A843] text-[#17283C] px-6 py-3.5 font-semibold hover:bg-[#c49a3d] transition flex items-center justify-center gap-2 disabled:opacity-50"
          data-testid="submit-payment-proof-btn"
        >
          {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : <><Upload className="w-5 h-5" /> Submit Payment Proof</>}
        </button>
      </form>
    </div>
  );
}
