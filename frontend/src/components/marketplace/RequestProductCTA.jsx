import React, { useState } from "react";
import { Search, Send, Loader2, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";

/**
 * "Can't find what you need?" CTA banner for marketplace.
 * Submits directly to Requests table via public request intake.
 */
export default function RequestProductCTA({ variant = "banner" }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ product_name: "", description: "", quantity: "", name: "", phone: "", email: "" });

  const submit = async () => {
    if (!form.product_name.trim()) { toast.error("Tell us what you're looking for"); return; }
    if (!form.name.trim() || !form.phone.trim()) { toast.error("Name and phone are required"); return; }
    setSubmitting(true);
    try {
      await api.post("/api/public/quote-requests", {
        items: [],
        custom_items: [{ name: form.product_name, quantity: Number(form.quantity) || 1, unit_of_measurement: "Piece", description: form.description }],
        category: "Marketplace Request",
        customer_note: form.description,
        customer: { first_name: form.name.split(" ")[0], last_name: form.name.split(" ").slice(1).join(" "), phone: form.phone, email: form.email, company: "" },
        source: "marketplace_cta",
      });
      setSuccess(true);
      toast.success("Request submitted! Our team will contact you shortly.");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to submit");
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center" data-testid="request-product-success">
        <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
        <p className="text-sm font-semibold text-emerald-700">Request received!</p>
        <p className="text-xs text-emerald-600 mt-1">Our team will contact you shortly with pricing and availability.</p>
        <button onClick={() => { setSuccess(false); setOpen(false); setForm({ product_name: "", description: "", quantity: "", name: "", phone: "", email: "" }); }} className="text-xs text-emerald-600 underline mt-2">Submit another request</button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`w-full rounded-xl border-2 border-dashed border-[#D4A843]/40 bg-[#D4A843]/5 hover:bg-[#D4A843]/10 hover:border-[#D4A843]/60 transition p-4 text-center group ${variant === "compact" ? "p-3" : ""}`}
        data-testid="request-product-cta"
      >
        <Search className="w-5 h-5 mx-auto text-[#D4A843] mb-1 group-hover:scale-110 transition-transform" />
        <p className="text-sm font-semibold text-[#20364D]">Can't find what you need?</p>
        <p className="text-xs text-slate-500 mt-0.5">Ask for any product or service — we'll get you a quote</p>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[#D4A843]/30 bg-white p-5 shadow-sm" data-testid="request-product-form">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[#20364D]">Request a Product or Service</h3>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase">What are you looking for? *</label>
          <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} placeholder="e.g., Branded notebooks, Office cleaning, Uniforms..." className="mt-0.5 text-sm" data-testid="request-product-name" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-[10px] font-semibold text-slate-500 uppercase">Quantity</label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="e.g., 100" className="mt-0.5 text-sm" /></div>
          <div><label className="text-[10px] font-semibold text-slate-500 uppercase">Details / Specs</label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Color, size, material..." className="mt-0.5 text-sm" /></div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div><label className="text-[10px] font-semibold text-slate-500 uppercase">Your Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="mt-0.5 text-sm" data-testid="request-product-contact-name" /></div>
          <div><label className="text-[10px] font-semibold text-slate-500 uppercase">Phone *</label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+255 7XX..." className="mt-0.5 text-sm" data-testid="request-product-phone" /></div>
          <div><label className="text-[10px] font-semibold text-slate-500 uppercase">Email</label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Optional" className="mt-0.5 text-sm" /></div>
        </div>
        <Button onClick={submit} disabled={submitting} className="w-full bg-[#D4A843] hover:bg-[#c49a3d] text-[#17283C] font-semibold" data-testid="request-product-submit">
          {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
          Submit Request
        </Button>
      </div>
    </div>
  );
}
