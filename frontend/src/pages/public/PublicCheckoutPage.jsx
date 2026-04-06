import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Building2, Mail, MapPin, StickyNote,
  ShoppingCart, Loader2, ArrowLeft, Package, CheckCircle2,
  LogIn, UserPlus, Copy, Check, Upload, FileText, CreditCard,
  AlertCircle, ChevronRight
} from "lucide-react";
import { useCart } from "../../contexts/CartContext";
import PhoneNumberField from "../../components/forms/PhoneNumberField";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;
function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

// ─── Step indicators ────────────────────────────────────
const STEPS = [
  { key: "details", label: "Details & Order" },
  { key: "payment", label: "Payment & Proof" },
  { key: "done",    label: "Confirmation" },
];

function StepBar({ current }) {
  const idx = STEPS.findIndex(s => s.key === current);
  return (
    <div className="flex items-center gap-1 mb-8" data-testid="checkout-steps">
      {STEPS.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <React.Fragment key={step.key}>
            {i > 0 && <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mx-1" />}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all
              ${done ? "bg-green-100 text-green-700" : active ? "bg-[#20364D] text-white" : "bg-slate-100 text-slate-400"}`}
              data-testid={`step-${step.key}`}
            >
              {done ? <Check className="w-4 h-4" /> : <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs">{i + 1}</span>}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Order summary sidebar (reused across stages) ───────
function OrderSummary({ orderItems, orderTotal, orderCount, compact }) {
  if (!orderItems || orderItems.length === 0) return null;
  return (
    <div className={`rounded-2xl border bg-white p-5 ${compact ? "" : "sticky top-24"}`} data-testid="checkout-summary">
      <h2 className="text-base font-bold text-[#20364D] mb-3">Your Order ({orderCount})</h2>
      <div className="space-y-2.5 max-h-[320px] overflow-y-auto">
        {orderItems.map((item, i) => (
          <div key={item.id || item.product_id || i} className="flex gap-3 pb-2.5 border-b last:border-0">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
              {item.image_url ? (
                <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-4 h-4 text-slate-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{item.product_name}</p>
              <p className="text-xs text-slate-500">Qty: {item.quantity} x {money(item.unit_price)}</p>
            </div>
            <span className="text-sm font-semibold flex-shrink-0">{money(item.subtotal || (item.quantity * item.unit_price))}</span>
          </div>
        ))}
      </div>
      <div className="border-t mt-3 pt-3 flex justify-between font-bold text-[#20364D]">
        <span>Total</span>
        <span>{money(orderTotal)}</span>
      </div>
    </div>
  );
}

export default function PublicCheckoutPage() {
  const navigate = useNavigate();
  const { items, total, itemCount, clearCart } = useCart();

  // Stage: "details" | "payment" | "done"
  const [stage, setStage] = useState("details");
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [proofResult, setProofResult] = useState(null);
  const [copiedField, setCopiedField] = useState("");

  // Snapshot of items at order time (so sidebar persists after cart clear)
  const [orderSnapshot, setOrderSnapshot] = useState(null);

  // Forms
  const [form, setForm] = useState({
    customer_name: "", email: "", phone_prefix: "+255", phone: "",
    company_name: "", delivery_address: "", city: "", country: "Tanzania", notes: "",
  });
  const [proofForm, setProofForm] = useState({
    payer_name: "", amount_paid: "", bank_reference: "",
    payment_method: "bank_transfer", payment_date: new Date().toISOString().split("T")[0], notes: "",
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setP = (k, v) => setProofForm(p => ({ ...p, [k]: v }));
  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied!");
    setTimeout(() => setCopiedField(""), 2000);
  };

  // ─── Stage 1: Place Order ──────────────────────────────
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!form.customer_name || !form.email || !form.phone)
      return toast.error("Please fill in all required fields.");
    if (items.length === 0)
      return toast.error("Your cart is empty.");

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        items: items.map(item => ({
          product_id: item.product_id, product_name: item.product_name,
          quantity: item.quantity, unit_price: item.unit_price,
          subtotal: item.subtotal, size: item.size, color: item.color,
          variant: item.variant, listing_type: item.listing_type || "product",
        })),
      };
      const res = await fetch(`${API_URL}/api/public/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Checkout failed");

      // Snapshot cart BEFORE clearing (we DON'T clear yet)
      setOrderSnapshot({ items: [...items], total, itemCount });
      setOrderResult(data);
      setProofForm(p => ({ ...p, payer_name: form.customer_name, amount_paid: String(data.total || total) }));
      setStage("payment");
      toast.success(`Order ${data.order_number} placed! Now submit your payment proof.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err.message || "Checkout failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Stage 2: Submit Payment Proof ─────────────────────
  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!proofForm.payer_name) return toast.error("Enter the payer name.");
    if (!proofForm.amount_paid) return toast.error("Enter the amount paid.");

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/public/payment-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_number: orderResult.order_number,
          email: form.email,
          payer_name: proofForm.payer_name,
          amount_paid: parseFloat(proofForm.amount_paid),
          bank_reference: proofForm.bank_reference,
          payment_method: proofForm.payment_method,
          payment_date: proofForm.payment_date,
          notes: proofForm.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Submission failed");

      setProofResult(data);
      clearCart(); // NOW safe to clear — payment proof submitted
      setStage("done");
      toast.success("Payment proof submitted!");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Which items to show in sidebar
  const sideItems = orderSnapshot?.items || items;
  const sideTotal = orderSnapshot?.total || total;
  const sideCount = orderSnapshot?.itemCount || itemCount;

  // ─── Empty cart + no order in progress ─────────────────
  if (stage === "details" && items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#20364D]">Your cart is empty</h2>
        <p className="text-slate-500 mt-2">Add products before checking out.</p>
        <button onClick={() => navigate("/marketplace")}
          className="mt-4 rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold">
          Browse Marketplace
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // STAGE 3 — DONE
  // ═══════════════════════════════════════════════════════
  if (stage === "done") {
    const acc = proofResult?.account_info || orderResult?.account_info || {};
    return (
      <div className="max-w-3xl mx-auto px-6 py-10" data-testid="checkout-success">
        <StepBar current="done" />
        <div className="rounded-2xl bg-white border p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#20364D]">Order Complete</h1>
            <p className="text-slate-600 mt-1">
              Order <span className="font-bold">{orderResult?.order_number}</span>
            </p>
            <p className="text-slate-500 text-sm mt-1">
              Payment proof submitted. Our team will verify and process your order.
            </p>
          </div>

          {/* Order snapshot */}
          {orderSnapshot && (
            <div className="mb-6">
              <OrderSummary orderItems={orderSnapshot.items} orderTotal={orderSnapshot.total} orderCount={orderSnapshot.itemCount} compact />
            </div>
          )}

          {/* Account CTA — peak motivation */}
          {acc.type && (
            <div className="rounded-xl bg-gradient-to-r from-[#0E1A2B] to-[#20364D] p-6 text-white mb-6" data-testid="account-cta-after-payment">
              <p className="font-bold text-lg">{acc.message}</p>
              <ul className="text-sm text-slate-200 mt-2 space-y-1">
                <li>Track status updates</li>
                <li>View invoices and payments</li>
                <li>Reorder faster next time</li>
              </ul>
              <div className="mt-4">
                {acc.type === "login" ? (
                  <button onClick={() => navigate("/login")}
                    className="flex items-center gap-2 rounded-xl bg-[#D4A843] text-[#17283C] px-5 py-2.5 font-semibold hover:bg-[#c49a3d] transition"
                    data-testid="login-btn">
                    <LogIn className="w-4 h-4" /> Log In to Track Order
                  </button>
                ) : (
                  <button onClick={() => navigate(acc.invite_url || "/login")}
                    className="flex items-center gap-2 rounded-xl bg-[#D4A843] text-[#17283C] px-5 py-2.5 font-semibold hover:bg-[#c49a3d] transition"
                    data-testid="create-account-btn">
                    <UserPlus className="w-4 h-4" /> Create Account to Track Order
                  </button>
                )}
              </div>
            </div>
          )}

          <button onClick={() => navigate("/marketplace")}
            className="w-full rounded-xl border px-6 py-3 font-semibold text-slate-600 hover:bg-slate-50 transition">
            Continue Browsing
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // STAGE 2 — PAYMENT + PROOF (same page)
  // ═══════════════════════════════════════════════════════
  if (stage === "payment" && orderResult) {
    const bank = orderResult.bank_details || {};
    return (
      <div className="max-w-6xl mx-auto px-6 py-8" data-testid="checkout-payment-stage">
        <StepBar current="payment" />
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            {/* Order confirmed banner */}
            <div className="rounded-2xl bg-green-50 border border-green-200 p-5 flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="font-bold text-green-900">Order Placed</h2>
                <p className="text-green-800 text-sm">
                  Order <span className="font-bold">{orderResult.order_number}</span> — {money(orderResult.total)}
                </p>
                <p className="text-green-700 text-xs mt-1">Now complete your payment and submit proof below.</p>
              </div>
            </div>

            {/* Bank details */}
            <div className="rounded-2xl border bg-white p-6" data-testid="bank-details">
              <h2 className="text-lg font-bold text-[#20364D] mb-1 flex items-center gap-2">
                <CreditCard className="w-5 h-5" /> Payment Details
              </h2>
              <p className="text-slate-500 text-sm mb-4">Transfer to the account below, then fill in the proof form.</p>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {[
                  ["Bank", bank.bank_name],
                  ["Account Name", bank.account_name],
                  ["Account Number", bank.account_number],
                  ["Branch", bank.branch],
                  ["SWIFT", bank.swift],
                ].map(([label, val]) => val && (
                  <div key={label} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <div className="flex-1">
                      <span className="text-slate-500 text-xs">{label}</span>
                      <p className="font-semibold text-[#20364D]">{val}</p>
                    </div>
                    <button onClick={() => handleCopy(val, label)} className="p-1 text-slate-400 hover:text-[#20364D]">
                      {copiedField === label ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span><strong>Reference:</strong> Use <span className="font-bold">{orderResult.order_number}</span> as your payment reference.</span>
              </div>
            </div>

            {/* Payment proof form — inline */}
            <form onSubmit={handleSubmitProof} className="rounded-2xl border bg-white p-6 space-y-4" data-testid="payment-proof-form">
              <h2 className="text-lg font-bold text-[#20364D] flex items-center gap-2">
                <Upload className="w-5 h-5" /> Submit Payment Proof
              </h2>
              <p className="text-sm text-slate-500">After transferring, fill in the details below to speed up verification.</p>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Payer Name *</label>
                  <input type="text" value={proofForm.payer_name} onChange={e => setP("payer_name", e.target.value)}
                    className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                    placeholder="Name on the bank transfer" required data-testid="pp-payer-name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount Paid (TZS) *</label>
                  <input type="number" step="0.01" value={proofForm.amount_paid} onChange={e => setP("amount_paid", e.target.value)}
                    className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                    required data-testid="pp-amount" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Bank Reference / Receipt</label>
                  <input type="text" value={proofForm.bank_reference} onChange={e => setP("bank_reference", e.target.value)}
                    className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                    placeholder="TXN-123456" data-testid="pp-reference" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Method</label>
                  <select value={proofForm.payment_method} onChange={e => setP("payment_method", e.target.value)}
                    className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                    data-testid="pp-method">
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money (M-Pesa, Tigo Pesa)</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Date</label>
                  <input type="date" value={proofForm.payment_date} onChange={e => setP("payment_date", e.target.value)}
                    className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                    data-testid="pp-date" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Additional Notes</label>
                <textarea value={proofForm.notes} onChange={e => setP("notes", e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 min-h-[70px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  placeholder="Any details about the transfer..." data-testid="pp-notes" />
              </div>

              <button type="submit" disabled={submitting}
                className="w-full rounded-xl bg-[#D4A843] text-[#17283C] px-6 py-3.5 font-semibold hover:bg-[#c49a3d] transition flex items-center justify-center gap-2 disabled:opacity-50"
                data-testid="submit-payment-proof-btn">
                {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : <><Upload className="w-5 h-5" /> Submit Payment Proof</>}
              </button>
            </form>
          </div>

          {/* Sidebar — order summary persists */}
          <div className="lg:col-span-2">
            <OrderSummary orderItems={sideItems} orderTotal={sideTotal} orderCount={sideCount} />
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // STAGE 1 — DETAILS + ORDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="max-w-6xl mx-auto px-6 py-8" data-testid="public-checkout-page">
      <button onClick={() => navigate("/cart")} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#20364D] mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Cart
      </button>

      <StepBar current="details" />

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Form */}
        <form onSubmit={handlePlaceOrder} className="lg:col-span-3 space-y-6" data-testid="checkout-form">
          <section className="rounded-2xl border bg-white p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#20364D]">Contact Details</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5"><User className="w-3.5 h-3.5 inline mr-1" />Full Name *</label>
                <input type="text" value={form.customer_name} onChange={e => set("customer_name", e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  placeholder="John Doe" required data-testid="checkout-name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5"><Building2 className="w-3.5 h-3.5 inline mr-1" />Company</label>
                <input type="text" value={form.company_name} onChange={e => set("company_name", e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  placeholder="Acme Corp" data-testid="checkout-company" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5"><Mail className="w-3.5 h-3.5 inline mr-1" />Email *</label>
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  placeholder="you@company.com" required data-testid="checkout-email" />
              </div>
              <PhoneNumberField
                prefix={form.phone_prefix} number={form.phone}
                onPrefixChange={v => set("phone_prefix", v)} onNumberChange={v => set("phone", v)}
                required testIdPrefix="checkout-phone" />
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#20364D]">Delivery Details</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5"><MapPin className="w-3.5 h-3.5 inline mr-1" />Delivery Address</label>
                <input type="text" value={form.delivery_address} onChange={e => set("delivery_address", e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  placeholder="Street address" data-testid="checkout-address" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
                <input type="text" value={form.city} onChange={e => set("city", e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  placeholder="Dar es Salaam" data-testid="checkout-city" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Country</label>
                <input type="text" value={form.country} onChange={e => set("country", e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                  data-testid="checkout-country" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5"><StickyNote className="w-3.5 h-3.5 inline mr-1" />Notes</label>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                className="w-full border rounded-xl px-4 py-2.5 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                placeholder="Any special instructions..." data-testid="checkout-notes" />
            </div>
          </section>

          <button type="submit" disabled={submitting}
            className="w-full rounded-xl bg-[#D4A843] text-[#17283C] px-6 py-3.5 font-semibold hover:bg-[#c49a3d] transition flex items-center justify-center gap-2 disabled:opacity-50"
            data-testid="place-order-btn">
            {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Placing Order...</> : <>Place Order — {money(total)}</>}
          </button>

          <p className="text-xs text-center text-slate-400">
            No account required. You will see payment details on the next step.
          </p>
        </form>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-2">
          <OrderSummary orderItems={items} orderTotal={total} orderCount={itemCount} />
        </div>
      </div>
    </div>
  );
}
