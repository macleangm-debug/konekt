import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquarePlus, ArrowRight, Send, Loader2, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";
import api from "../../lib/api";

export default function CantFindWhatYouNeedBanner({ className = "" }) {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ product: "", description: "", qty: "", name: "", phone: "", email: "" });

  const submit = async () => {
    if (!form.product.trim()) { toast.error("Tell us what you need"); return; }
    if (!form.name.trim() || !form.phone.trim()) { toast.error("Name and phone are required"); return; }
    setSubmitting(true);
    try {
      await api.post("/api/public/quote-requests", {
        items: [],
        custom_items: [{ name: form.product, quantity: Number(form.qty) || 1, unit_of_measurement: "Piece", description: form.description }],
        category: "Marketplace Request",
        customer_note: form.description,
        customer: { first_name: form.name.split(" ")[0], last_name: form.name.split(" ").slice(1).join(" "), phone: form.phone, email: form.email, company: "" },
        source: "marketplace_cta",
      });
      setSuccess(true);
      toast.success("Request submitted! Our team will contact you shortly.");
    } catch { toast.error("Failed to submit request"); }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className={`rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center ${className}`} data-testid="cant-find-success">
        <CheckCircle className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
        <h3 className="font-bold text-emerald-700">Request received!</h3>
        <p className="text-sm text-emerald-600 mt-1">Our team will get back to you with a quote.</p>
        <button onClick={() => { setSuccess(false); setShowForm(false); setForm({ product: "", description: "", qty: "", name: "", phone: "", email: "" }); }} className="text-xs text-emerald-600 underline mt-3">Submit another</button>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden ${className}`} data-testid="cant-find-banner">
      {/* Banner */}
      <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <MessageSquarePlus className="w-6 h-6 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-[#20364D]">Can't find what you're looking for?</h3>
          <p className="text-sm text-slate-700 mt-1">
            Our marketplace is a showroom — we offer much more. Tell us what you need and we'll source it for you.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setShowForm(!showForm)} className="rounded-xl bg-[#20364D] text-white px-5 py-3 text-sm font-semibold hover:bg-[#2d4a66] transition flex items-center gap-2" data-testid="cant-find-cta-btn">
            {showForm ? "Close" : <>Ask for a Product or Service <ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>

      {/* Inline Request Form */}
      {showForm && (
        <div className="border-t border-amber-200 bg-white p-6 space-y-3" data-testid="cant-find-form">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">What do you need? *</label>
              <input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} placeholder="e.g., Branded notebooks, Office cleaning, Custom uniforms..." className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4A843]/30 outline-none" data-testid="cta-product-input" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Quantity</label>
              <input type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} placeholder="e.g., 100" className="w-full mt-1 border rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Details / Specifications</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Color, size, material, deadline..." className="w-full mt-1 border rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Your Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="w-full mt-1 border rounded-lg px-3 py-2 text-sm outline-none" data-testid="cta-name-input" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Phone *</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+255 7XX XXX XXX" className="w-full mt-1 border rounded-lg px-3 py-2 text-sm outline-none" data-testid="cta-phone-input" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Optional" className="w-full mt-1 border rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
          </div>
          <button onClick={submit} disabled={submitting} className="w-full rounded-xl bg-[#D4A843] hover:bg-[#c49a3d] text-[#17283C] font-semibold py-3 text-sm flex items-center justify-center gap-2 transition disabled:opacity-50" data-testid="cta-submit-btn">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit Request
          </button>
        </div>
      )}
    </div>
  );
}
