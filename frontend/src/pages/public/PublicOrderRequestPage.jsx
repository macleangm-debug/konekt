import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PhoneNumberField from "../../components/forms/PhoneNumberField";
import { toast } from "sonner";
import {
  Send, Building2, User, Mail, Package, Hash,
  CheckCircle2, Loader2, ArrowLeft, StickyNote, Layers3
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PublicOrderRequestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const productId = searchParams.get("product_id") || "";
  const productName = searchParams.get("name") || "";
  const productPrice = searchParams.get("price") || "";
  const productCategory = searchParams.get("category") || "";
  const productVariant = searchParams.get("variant") || "";

  const [submitted, setSubmitted] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_prefix: "+255",
    phone: "",
    company_name: "",
    quantity: 1,
    variant_selection: productVariant,
    notes: "",
  });

  const handleChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email)
      return toast.error("Please fill in your name and email.");
    if (!form.phone)
      return toast.error("Please provide a phone number.");

    setSubmitting(true);
    try {
      const payload = {
        request_type: "marketplace_order",
        title: `Order Request: ${productName || "Marketplace Product"}`,
        guest_name: form.full_name,
        guest_email: form.email,
        phone_prefix: form.phone_prefix,
        phone: form.phone,
        company_name: form.company_name,
        source_page: "/order-request",
        details: {
          product_id: productId,
          product_name: productName,
          product_price: productPrice,
          product_category: productCategory,
          quantity: form.quantity,
          variant_selection: form.variant_selection,
          source: "public_marketplace_order_request",
        },
        notes: form.notes,
      };

      const res = await fetch(`${API_URL}/api/public-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Unable to submit order request.");
      setSubmitted(data);
      toast.success(`Order request submitted: ${data.request_number}`);
    } catch (err) {
      toast.error(err.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16" data-testid="order-request-success">
        <div className="rounded-2xl bg-white border p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#20364D]">Order Request Received</h1>
          <p className="text-slate-600 mt-3">
            Reference: <span className="font-semibold">{submitted.request_number}</span>
          </p>
          <p className="text-slate-500 mt-2 text-sm">
            Our sales team will review your request and follow up with pricing, availability, and next steps.
          </p>
          {submitted.account_invite && (
            <div className="mt-5 rounded-xl bg-blue-50 border border-blue-200 p-4 text-left" data-testid="order-activation-banner">
              <p className="font-bold text-blue-900 text-sm">Your Konekt account has been created</p>
              <p className="text-blue-800 text-xs mt-1">Activate it to track orders, invoices, and more.</p>
              <a
                href={submitted.account_invite.invite_url}
                className="inline-block mt-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 transition"
              >
                Activate Account
              </a>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <button
              onClick={() => navigate("/marketplace")}
              className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#17283c] transition"
              data-testid="order-browse-marketplace"
            >
              Continue Browsing
            </button>
            <button
              onClick={() => navigate("/")}
              className="rounded-xl border px-5 py-3 font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10" data-testid="order-request-page">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#20364D] mb-6"
        data-testid="order-request-back-btn"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header */}
      <section className="rounded-2xl bg-gradient-to-r from-[#0E1A2B] to-[#20364D] text-white p-7 mb-7">
        <div className="text-xs tracking-[0.2em] uppercase text-slate-300 font-semibold">
          Order Request
        </div>
        <h1 className="text-3xl font-bold mt-3">Submit Your Order</h1>
        <p className="text-slate-200 mt-2 max-w-xl">
          Fill in your details and our team will process your order, confirm pricing, and arrange delivery.
        </p>
      </section>

      {/* Product Summary */}
      {productName && (
        <div className="rounded-2xl border bg-slate-50 p-5 mb-7 flex items-start gap-4" data-testid="order-product-summary">
          <div className="w-12 h-12 rounded-xl bg-[#20364D]/10 flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6 text-[#20364D]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#20364D]">{productName}</h3>
            {productCategory && (
              <p className="text-xs text-slate-500 mt-0.5">{productCategory}</p>
            )}
            {productPrice && (
              <p className="text-sm font-medium text-slate-700 mt-1">
                TZS {Number(productPrice).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white border p-7 space-y-7"
        data-testid="order-request-form"
      >
        <section>
          <h2 className="text-xl font-bold text-[#20364D] mb-5">Your Details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <User className="w-3.5 h-3.5 inline mr-1.5" />Full Name *
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                placeholder="John Doe"
                required
                data-testid="order-fullname"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Building2 className="w-3.5 h-3.5 inline mr-1.5" />Company
              </label>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) => handleChange("company_name", e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                placeholder="Acme Corporation"
                data-testid="order-company"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Mail className="w-3.5 h-3.5 inline mr-1.5" />Email *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                placeholder="you@company.com"
                required
                data-testid="order-email"
              />
            </div>
            <PhoneNumberField
              prefix={form.phone_prefix}
              number={form.phone}
              onPrefixChange={(v) => handleChange("phone_prefix", v)}
              onNumberChange={(v) => handleChange("phone", v)}
              required
              testIdPrefix="order-phone"
            />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D] mb-5">Order Details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Hash className="w-3.5 h-3.5 inline mr-1.5" />Quantity
              </label>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => handleChange("quantity", Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                data-testid="order-quantity"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Layers3 className="w-3.5 h-3.5 inline mr-1.5" />Variant / Size / Color
              </label>
              <input
                type="text"
                value={form.variant_selection}
                onChange={(e) => handleChange("variant_selection", e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                placeholder="e.g., Large / Blue"
                data-testid="order-variant"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <StickyNote className="w-3.5 h-3.5 inline mr-1.5" />Additional Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
              placeholder="Any special requirements, delivery preferences, etc."
              data-testid="order-notes"
            />
          </div>
        </section>

        <div className="rounded-xl bg-slate-50 border px-4 py-3 text-sm text-slate-600">
          <strong>What happens next?</strong>
          <p className="mt-1">Our sales team will confirm availability, pricing, and delivery timeline — then send you a formal quote or invoice.</p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-[#D4A843] text-[#17283C] px-6 py-3.5 font-semibold hover:bg-[#c49a3d] transition flex items-center justify-center gap-2 disabled:opacity-50"
          data-testid="submit-order-request-btn"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Submit Order Request
            </>
          )}
        </button>
      </form>
    </div>
  );
}
