import React, { useState } from "react";
import { Send, Package, Palette, Wrench, X, Loader2 } from "lucide-react";
import api from "../../lib/api";
import { toast } from "sonner";

const REQUEST_TYPES = [
  { key: "product_bulk", label: "Bulk Quote", icon: Package, description: "Request a bulk order quote for products" },
  { key: "promo_custom", label: "Custom Promo", icon: Palette, description: "Customize promotional materials" },
  { key: "promo_sample", label: "Request Sample", icon: Send, description: "Get a sample before committing" },
  { key: "service_quote", label: "Service Quote", icon: Wrench, description: "Request a quote for services" },
];

export default function QuickRequestForm({ onClose, prefillType }) {
  const [type, setType] = useState(prefillType || "");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!type) return toast.error("Select a request type");
    setSubmitting(true);
    try {
      const res = await api.post("/api/requests", {
        request_type: type,
        title: title || `${type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} Request`,
        notes,
        details: {},
      });
      if (res.data.ok) {
        setSuccess(true);
        toast.success(`Request ${res.data.request_number} submitted!`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit request");
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-center" data-testid="quick-request-success">
        <Send className="w-10 h-10 text-emerald-500 mx-auto" />
        <h3 className="text-lg font-bold text-[#20364D] mt-3">Request Submitted</h3>
        <p className="text-sm text-slate-500 mt-2">Our sales team will review and get back to you shortly.</p>
        <button onClick={onClose} className="mt-4 text-sm text-[#20364D] underline" data-testid="close-success-btn">Close</button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-6" data-testid="quick-request-form">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#20364D]">Quick Request</h3>
        {onClose && <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {REQUEST_TYPES.map((rt) => (
            <button key={rt.key} type="button" onClick={() => setType(rt.key)}
              className={`flex items-center gap-2 p-3 rounded-xl border text-left text-sm transition ${
                type === rt.key ? "border-[#20364D] bg-slate-50 ring-1 ring-[#20364D]" : "border-slate-200 hover:border-slate-300"
              }`}
              data-testid={`request-type-${rt.key}`}>
              <rt.icon className="w-4 h-4 text-[#20364D] shrink-0" />
              <div>
                <div className="font-semibold">{rt.label}</div>
                <div className="text-xs text-slate-400">{rt.description}</div>
              </div>
            </button>
          ))}
        </div>

        <input value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
          placeholder="Request title (optional)" data-testid="request-title-input" />

        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          className="w-full border rounded-xl px-4 py-3 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
          placeholder="Additional details or notes..." data-testid="request-notes-input" />

        <button type="submit" disabled={submitting || !type}
          className="w-full py-3 bg-[#20364D] text-white rounded-xl font-semibold text-sm disabled:opacity-40 transition"
          data-testid="submit-request-btn">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Submit Request"}
        </button>
      </form>
    </div>
  );
}
