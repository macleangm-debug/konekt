import React, { useState, useEffect } from "react";
import { X, ArrowLeft, MapPin, User, FileText, ShieldCheck, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import api from "../../lib/api";
import PhoneNumberField from "../forms/PhoneNumberField";
import { combinePhone } from "../../utils/phoneUtils";

export default function CheckoutPanel({ items = [], onClose, onComplete, total = 0 }) {
  const [step, setStep] = useState("form"); // form | submitting | success
  const [form, setForm] = useState({
    name: "",
    phone_prefix: "+255",
    phone: "",
    street: "",
    city: "",
    region: "",
    notes: "",
  });

  // Auto-fill user info
  useEffect(() => {
    const name = localStorage.getItem("userName") || "";
    const email = localStorage.getItem("userEmail") || "";
    setForm(prev => ({
      ...prev,
      name: name || prev.name,
    }));
  }, []);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const calculatedTotal = total || items.reduce((sum, item) => {
    const price = Number(item.price || item.numericPrice || item.base_price || item.unit_price || item.subtotal || 0);
    return sum + price;
  }, 0);

  const vatRate = 0.18;
  const vatAmount = Math.round(calculatedTotal * vatRate);
  const grandTotal = calculatedTotal + vatAmount;

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("Please add a phone number");
      return;
    }
    if (!form.street.trim() || !form.city.trim()) {
      toast.error("Please add your delivery address");
      return;
    }

    setStep("submitting");

    try {
      const quoteItems = items.map(item => ({
        name: item.name || "Item",
        sku: item.sku || item.product_id || "",
        quantity: item.quantity || 1,
        unit_price: Number(item.price || item.numericPrice || item.base_price || item.unit_price || 0),
        subtotal: Number(item.price || item.numericPrice || item.base_price || item.subtotal || 0) * (item.quantity || 1),
      }));

      const payload = {
        items: quoteItems,
        subtotal: calculatedTotal,
        vat_percent: 18,
        vat_amount: vatAmount,
        total: grandTotal,
        delivery_address: {
          street: form.street,
          city: form.city,
          region: form.region || form.city,
          country: "Tanzania",
          contact_phone: combinePhone(form.phone_prefix, form.phone),
        },
        delivery_notes: form.notes || null,
        source: "checkout_panel",
      };

      const res = await api.post("/api/customer/checkout-quote", payload);
      setStep("success");

      // Delay to show success state
      setTimeout(() => {
        if (onComplete) onComplete(res.data);
      }, 2000);
    } catch (err) {
      console.error("Checkout failed:", err);
      toast.error(err?.response?.data?.detail || "Failed to submit. Please try again.");
      setStep("form");
    }
  };

  // Success screen
  if (step === "success") {
    return (
      <div className="fixed inset-0 z-[60] flex justify-end" data-testid="checkout-panel">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-[440px] h-full bg-white shadow-2xl flex flex-col items-center justify-center p-8 animate-in slide-in-from-right">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-[#0f172a] text-center">Quote Submitted!</h2>
          <p className="text-sm text-[#64748b] text-center mt-2 max-w-xs">
            Our sales team will review and send you a confirmed quote shortly.
          </p>
          <button
            onClick={onClose}
            className="mt-6 bg-[#0f172a] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1e293b] transition-colors"
            data-testid="checkout-done-btn"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" data-testid="checkout-panel">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[440px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-[#f8fafc] transition-colors"
            data-testid="checkout-back-btn"
          >
            <ArrowLeft className="w-4 h-4 text-[#64748b]" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-[#0f172a]">Checkout</h2>
            <p className="text-xs text-[#94a3b8]">{items.length} item{items.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">

            {/* Contact Section */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-[#1f3a5f]" />
                <h3 className="text-sm font-semibold text-[#0f172a]">Contact</h3>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-[#1f3a5f] focus:border-transparent outline-none transition"
                  data-testid="checkout-name"
                />
                <PhoneNumberField
                  label=""
                  prefix={form.phone_prefix}
                  number={form.phone}
                  onPrefixChange={(v) => update("phone_prefix", v)}
                  onNumberChange={(v) => update("phone", v)}
                  testIdPrefix="checkout-phone"
                />
              </div>
            </section>

            {/* Delivery Section */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-[#1f3a5f]" />
                <h3 className="text-sm font-semibold text-[#0f172a]">Delivery</h3>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Street Address"
                  value={form.street}
                  onChange={(e) => update("street", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-[#1f3a5f] focus:border-transparent outline-none transition"
                  data-testid="checkout-street"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-[#1f3a5f] focus:border-transparent outline-none transition"
                    data-testid="checkout-city"
                  />
                  <input
                    type="text"
                    placeholder="Region"
                    value={form.region}
                    onChange={(e) => update("region", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-[#1f3a5f] focus:border-transparent outline-none transition"
                    data-testid="checkout-region"
                  />
                </div>
              </div>
            </section>

            {/* Notes Section */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-[#1f3a5f]" />
                <h3 className="text-sm font-semibold text-[#0f172a]">Notes</h3>
                <span className="text-xs text-[#94a3b8]">(optional)</span>
              </div>
              <textarea
                placeholder="Special instructions, branding requirements..."
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-[#1f3a5f] focus:border-transparent outline-none transition resize-none"
                data-testid="checkout-notes"
              />
            </section>

            {/* Order Summary */}
            <section>
              <h3 className="text-sm font-semibold text-[#0f172a] mb-3">Order Summary</h3>
              <div className="bg-[#f8fafc] rounded-xl p-4 space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-[#64748b] truncate mr-3">
                      {item.name || "Item"}{item.quantity > 1 ? ` x${item.quantity}` : ""}
                    </span>
                    <span className="font-medium text-[#0f172a] whitespace-nowrap">
                      TZS {Number(item.price || item.numericPrice || item.base_price || item.unit_price || item.subtotal || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748b]">Subtotal</span>
                    <span className="text-[#0f172a]">TZS {calculatedTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-[#64748b]">VAT (18%)</span>
                    <span className="text-[#0f172a]">TZS {vatAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold mt-2 pt-2 border-t border-gray-200">
                    <span className="text-[#0f172a]">Total</span>
                    <span className="text-[#0f172a]">TZS {grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="border-t border-gray-100 p-6 bg-white">
          {/* Trust Element */}
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-xs text-[#64748b]">
              No payment required now. You'll receive a confirmed quote before any charges.
            </p>
          </div>

          {/* Submit CTA */}
          <button
            onClick={handleSubmit}
            disabled={step === "submitting"}
            className="w-full bg-[#0f172a] text-white py-3.5 rounded-lg text-sm font-semibold hover:bg-[#1e293b] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-md"
            data-testid="checkout-submit-btn"
          >
            {step === "submitting" ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </span>
            ) : (
              `Request Quote — TZS ${grandTotal.toLocaleString()}`
            )}
          </button>

          {/* Sales Assist */}
          <p className="text-center mt-3">
            <button
              onClick={() => {
                onClose();
                toast.info("Redirecting to Sales Assist...");
                window.location.href = "/account/assisted-quote";
              }}
              className="text-xs text-[#1f3a5f] underline underline-offset-2 hover:text-[#0f172a] transition-colors"
              data-testid="checkout-sales-assist-link"
            >
              Prefer help? Let sales handle this
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
