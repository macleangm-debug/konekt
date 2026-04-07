import React, { useState } from "react";
import { X, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function SalesAssistModal({ isOpen, onClose, productName = "", productId = "", source = "marketplace_sales_assist" }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customer_name: "", company_name: "", email: "", phone: "",
    product_name: productName, quantity: "", notes: "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name || !form.email) {
      toast.error("Please provide your name and email");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/public/sales-assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quantity: form.quantity ? parseInt(form.quantity, 10) : null,
          product_id: productId,
          page_url: window.location.href,
          source,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
    } catch {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/20";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center" data-testid="sales-assist-modal-overlay">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto" data-testid="sales-assist-modal">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-[#20364D]">Talk to Sales</h3>
          <button
            type="button"
            className="rounded-full p-2 hover:bg-slate-100 transition"
            onClick={() => { onClose(); setSubmitted(false); }}
            data-testid="sales-assist-modal-close"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-sm text-slate-600 mb-4">
              Tell us what you need and our sales team will prepare the right quote for you.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <input className={inputCls} placeholder="Your name *" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} data-testid="sa-name" />
              <input className={inputCls} placeholder="Company name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} data-testid="sa-company" />
              <input className={inputCls} placeholder="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="sa-email" />
              <input className={inputCls} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="sa-phone" />
              <input className={inputCls} placeholder="Product or Service" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} data-testid="sa-product" />
              <input className={inputCls} placeholder="Quantity" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} data-testid="sa-quantity" />
            </div>
            <textarea
              className={`${inputCls} min-h-[100px]`}
              placeholder="Tell us how you'd like help with this order (custom branding, bulk pricing, service details, etc.)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              data-testid="sa-notes"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#20364D] text-white px-6 py-3.5 font-semibold hover:bg-[#17283c] transition flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="sa-submit-btn"
            >
              <Send className="w-4 h-4" />
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center" data-testid="sa-success">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <h4 className="text-lg font-bold text-emerald-800">Request Sent</h4>
            <p className="text-sm text-emerald-700 mt-2">
              Your request has been sent to our sales team. A team member will reach out to assist you with your order.
            </p>
            <button
              type="button"
              className="mt-4 rounded-xl border border-emerald-300 px-5 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition"
              onClick={() => { onClose(); setSubmitted(false); }}
              data-testid="sa-done-btn"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
