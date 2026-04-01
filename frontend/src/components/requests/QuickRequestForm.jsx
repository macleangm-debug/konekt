import React, { useMemo, useState } from "react";
import { Send, Package, Palette, Wrench, X, Loader2, Layers3 } from "lucide-react";
import api from "../../lib/api";
import { toast } from "sonner";

const PRIMARY_LANES = [
  { key: "products", label: "Products", icon: Package, description: "Office equipment, stationery, and operational products" },
  { key: "promotional", label: "Promotional Materials", icon: Palette, description: "Custom branded items, print, uniforms, and samples" },
  { key: "services", label: "Services", icon: Wrench, description: "Installation, branding, cleaning, technical support, and more" },
];

const REQUEST_TYPE_OPTIONS = {
  products: [
    { key: "product_bulk", label: "Bulk Product Quote", helper: "Request quote for office equipment, stationery, PPE, or bulk items" },
  ],
  promotional: [
    { key: "promo_custom", label: "Customize & Request Quote", helper: "Branded merchandise, uniforms, printing, and promo packs" },
    { key: "promo_sample", label: "Request Sample", helper: "Validate promo output before full production" },
  ],
  services: [
    { key: "service_quote", label: "Service Quote", helper: "Request scoped support for service execution" },
  ],
};

export default function QuickRequestForm({ onClose, prefillType }) {
  const initialLane = useMemo(() => {
    if (["promo_custom", "promo_sample"].includes(prefillType)) return "promotional";
    if (prefillType === "service_quote") return "services";
    if (prefillType === "product_bulk") return "products";
    return "";
  }, [prefillType]);

  const [primaryLane, setPrimaryLane] = useState(initialLane);
  const [type, setType] = useState(prefillType || "");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const requestOptions = primaryLane ? REQUEST_TYPE_OPTIONS[primaryLane] : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!primaryLane) return toast.error("Choose what you need first");
    if (!type) return toast.error("Select a request type");

    setSubmitting(true);
    try {
      const res = await api.post("/api/requests", {
        request_type: type,
        title: title || `${type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} Request`,
        notes,
        details: {
          primary_lane: primaryLane,
        },
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
        <div>
          <h3 className="text-lg font-bold text-[#20364D]">Quick Request</h3>
          <p className="text-sm text-slate-500 mt-1">Start with products, promotional materials, or services.</p>
        </div>
        {onClose && <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3">
          {PRIMARY_LANES.map((lane) => (
            <button
              key={lane.key}
              type="button"
              onClick={() => { setPrimaryLane(lane.key); setType(REQUEST_TYPE_OPTIONS[lane.key][0].key); }}
              className={`flex items-start gap-3 p-4 rounded-xl border text-left transition ${
                primaryLane === lane.key ? "border-[#20364D] bg-slate-50 ring-1 ring-[#20364D]" : "border-slate-200 hover:border-slate-300"
              }`}
              data-testid={`lane-${lane.key}`}
            >
              <lane.icon className="w-4 h-4 text-[#20364D] mt-0.5" />
              <div>
                <div className="font-semibold">{lane.label}</div>
                <div className="text-xs text-slate-400 mt-1">{lane.description}</div>
              </div>
            </button>
          ))}
        </div>

        {requestOptions.length > 0 && (
          <div className="grid gap-2 md:grid-cols-2">
            {requestOptions.map((rt) => (
              <button key={rt.key} type="button" onClick={() => setType(rt.key)}
                className={`flex items-start gap-2 p-3 rounded-xl border text-left text-sm transition ${
                  type === rt.key ? "border-[#20364D] bg-slate-50 ring-1 ring-[#20364D]" : "border-slate-200 hover:border-slate-300"
                }`}
                data-testid={`request-type-${rt.key}`}>
                <Layers3 className="w-4 h-4 text-[#20364D] mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold">{rt.label}</div>
                  <div className="text-xs text-slate-400">{rt.helper}</div>
                </div>
              </button>
            ))}
          </div>
        )}

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
