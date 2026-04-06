import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Building2, Mail, Phone, MapPin, StickyNote,
  ShoppingCart, Loader2, ArrowLeft, Package, CheckCircle2,
  LogIn, UserPlus, Copy, Check
} from "lucide-react";
import { useCart } from "../../contexts/CartContext";
import PhoneNumberField from "../../components/forms/PhoneNumberField";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;
function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

export default function PublicCheckoutPage() {
  const navigate = useNavigate();
  const { items, total, itemCount, clearCart } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [copiedField, setCopiedField] = useState("");
  const [form, setForm] = useState({
    customer_name: "",
    email: "",
    phone_prefix: "+255",
    phone: "",
    company_name: "",
    delivery_address: "",
    city: "",
    country: "Tanzania",
    notes: "",
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied!");
    setTimeout(() => setCopiedField(""), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name || !form.email || !form.phone)
      return toast.error("Please fill in all required fields.");
    if (items.length === 0)
      return toast.error("Your cart is empty.");

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        phone: form.phone,
        items: items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          size: item.size,
          color: item.color,
          variant: item.variant,
          listing_type: item.listing_type || "product",
        })),
      };

      const res = await fetch(`${API_URL}/api/public/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Checkout failed");

      setResult(data);
      clearCart();
      toast.success(`Order ${data.order_number} placed successfully!`);
    } catch (err) {
      toast.error(err.message || "Checkout failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Success / Order Confirmation ────────────────────────
  if (result) {
    const bank = result.bank_details || {};
    const acc = result.account_info || {};

    return (
      <div className="max-w-3xl mx-auto px-6 py-12" data-testid="checkout-success">
        <div className="rounded-2xl bg-white border p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#20364D]">Order Placed Successfully</h1>
            <p className="text-slate-600 mt-1">
              Order <span className="font-bold">{result.order_number}</span> — {result.items_count} item(s)
            </p>
            <p className="text-xl font-bold text-[#20364D] mt-2">{money(result.total)}</p>
          </div>

          {/* Bank Payment Details */}
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-5 mb-6" data-testid="bank-details">
            <h2 className="font-bold text-blue-900 mb-3">Payment Instructions</h2>
            <p className="text-blue-800 text-sm mb-4">
              Transfer the exact amount to the bank account below, then upload your payment proof.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {[
                ["Bank", bank.bank_name],
                ["Account Name", bank.account_name],
                ["Account Number", bank.account_number],
                ["Branch", bank.branch],
                ["SWIFT", bank.swift],
              ].map(([label, val]) => val && (
                <div key={label} className="flex items-center gap-2">
                  <div>
                    <span className="text-blue-600 text-xs">{label}</span>
                    <p className="font-semibold text-blue-900">{val}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(val, label)}
                    className="ml-auto p-1 text-blue-500 hover:text-blue-700"
                  >
                    {copiedField === label ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              <strong>Reference:</strong> Use <span className="font-bold">{result.order_number}</span> as your payment reference.
            </div>
          </div>

          {/* Upload Payment Proof CTA */}
          <button
            onClick={() => navigate(`/payment-proof?order=${result.order_number}&email=${encodeURIComponent(form.email)}`)}
            className="w-full rounded-xl bg-[#D4A843] text-[#17283C] px-6 py-3.5 font-semibold hover:bg-[#c49a3d] transition text-center"
            data-testid="upload-payment-proof-btn"
          >
            Upload Payment Proof
          </button>

          {/* Account CTA */}
          {acc.type && (
            <div className="mt-5 rounded-xl bg-slate-50 border p-5" data-testid="account-cta">
              <p className="font-semibold text-[#20364D] text-sm">{acc.message}</p>
              <p className="text-slate-500 text-xs mt-1">Track orders, view invoices, and reorder easily.</p>
              <div className="flex gap-3 mt-3">
                {acc.type === "login" ? (
                  <button
                    onClick={() => navigate("/login")}
                    className="flex items-center gap-2 rounded-lg bg-[#20364D] text-white px-4 py-2 text-sm font-semibold hover:bg-[#17283c] transition"
                    data-testid="login-to-track-btn"
                  >
                    <LogIn className="w-4 h-4" /> Log In to Track
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(acc.invite_url || "/login")}
                    className="flex items-center gap-2 rounded-lg bg-[#20364D] text-white px-4 py-2 text-sm font-semibold hover:bg-[#17283c] transition"
                    data-testid="create-account-btn"
                  >
                    <UserPlus className="w-4 h-4" /> Create Account
                  </button>
                )}
              </div>
            </div>
          )}

          <button
            onClick={() => navigate("/marketplace")}
            className="w-full mt-4 rounded-xl border px-6 py-3 font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Continue Browsing
          </button>
        </div>
      </div>
    );
  }

  // ─── Empty Cart Guard ─────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#20364D]">Your cart is empty</h2>
        <p className="text-slate-500 mt-2">Add products before checking out.</p>
        <button
          onClick={() => navigate("/marketplace")}
          className="mt-4 rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold"
        >
          Browse Marketplace
        </button>
      </div>
    );
  }

  // ─── Checkout Form ─────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-6 py-8" data-testid="public-checkout-page">
      <button onClick={() => navigate("/cart")} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#20364D] mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Cart
      </button>

      <h1 className="text-2xl font-bold text-[#20364D] mb-6">Checkout</h1>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-6" data-testid="checkout-form">
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
            data-testid="place-order-btn"
          >
            {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Placing Order...</> : <>Place Order — {money(total)}</>}
          </button>

          <p className="text-xs text-center text-slate-400">
            No account required. You will receive payment details after placing the order.
          </p>
        </form>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border bg-white p-6 sticky top-24" data-testid="checkout-summary">
            <h2 className="text-lg font-bold text-[#20364D] mb-4">Your Order ({itemCount})</h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {items.map(item => (
                <div key={item.id} className="flex gap-3 pb-3 border-b last:border-0">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{item.product_name}</p>
                    <p className="text-xs text-slate-500">Qty: {item.quantity} x {money(item.unit_price)}</p>
                  </div>
                  <span className="text-sm font-semibold">{money(item.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="border-t mt-4 pt-4 flex justify-between text-lg font-bold text-[#20364D]">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
