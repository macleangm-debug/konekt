import React, { useState } from "react";
import { Plus, Trash2, Send, Loader2, CheckCircle2 } from "lucide-react";
import api from "../../lib/api";
import { toast } from "sonner";

const PRINT_TYPES = [
  { value: "digital_print", label: "Digital Print" },
  { value: "screen_print", label: "Screen Print" },
  { value: "embroidery", label: "Embroidery" },
  { value: "sublimation", label: "Sublimation" },
  { value: "engraving", label: "Engraving / Laser Cut" },
  { value: "vinyl", label: "Vinyl / Heat Transfer" },
  { value: "offset", label: "Offset Print" },
  { value: "uv_print", label: "UV Print" },
  { value: "not_sure", label: "Not sure — advise me" },
];

function createBlankItem() {
  return { id: Date.now(), item_name: "", quantity: 1, print_type: "not_sure", notes: "" };
}

export default function PromoMultiBlankBuilder({ onSubmitted }) {
  const [items, setItems] = useState([createBlankItem()]);
  const [brandingNotes, setBrandingNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const addItem = () => setItems((prev) => [...prev, createBlankItem()]);
  const removeItem = (id) => setItems((prev) => prev.filter((x) => x.id !== id));
  const updateItem = (id, field, value) =>
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, [field]: value } : x)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validItems = items.filter((x) => x.item_name.trim());
    if (!validItems.length) return toast.error("Add at least one promotional item");

    setSubmitting(true);
    try {
      const res = await api.post("/api/requests", {
        request_type: "promo_custom",
        title: `Promotional Materials — ${validItems.length} item${validItems.length > 1 ? "s" : ""}`,
        notes: brandingNotes,
        details: {
          primary_lane: "promotional",
          promo_items: validItems.map(({ item_name, quantity, print_type, notes }) => ({
            item_name, quantity, print_type, notes,
          })),
          branding_notes: brandingNotes,
        },
      });
      if (res.data.ok) {
        setSuccess(true);
        toast.success(`Promo request ${res.data.request_number} submitted`);
        onSubmitted?.();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit");
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center" data-testid="promo-builder-success">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
        <h3 className="text-xl font-bold text-[#20364D] mt-4">Promo Request Submitted</h3>
        <p className="text-sm text-slate-500 mt-2">Our sales team will review your items and prepare a quote.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border bg-white p-6 space-y-5" data-testid="promo-multi-blank-builder">
      <div>
        <h3 className="text-lg font-bold text-[#20364D]">Build Your Promotional Request</h3>
        <p className="text-sm text-slate-500 mt-1">Add each promotional item you need — include quantities, print/customization type, and notes.</p>
      </div>

      <div className="space-y-4">
        {items.map((item, idx) => (
          <div key={item.id} className="rounded-xl border bg-slate-50 p-4 space-y-3" data-testid={`promo-item-${idx}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#20364D]">Item {idx + 1}</span>
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600" data-testid={`remove-item-${idx}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <input
                value={item.item_name}
                onChange={(e) => updateItem(item.id, "item_name", e.target.value)}
                placeholder="Item name (e.g. Branded Notebooks)"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                data-testid={`item-name-${idx}`}
              />
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                placeholder="Qty"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                data-testid={`item-qty-${idx}`}
              />
              <select
                value={item.print_type}
                onChange={(e) => updateItem(item.id, "print_type", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                data-testid={`item-print-type-${idx}`}
              >
                {PRINT_TYPES.map((pt) => (
                  <option key={pt.value} value={pt.value}>{pt.label}</option>
                ))}
              </select>
            </div>
            <textarea
              value={item.notes}
              onChange={(e) => updateItem(item.id, "notes", e.target.value)}
              placeholder="Specifications, colors, branding details..."
              className="w-full border rounded-lg px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
              data-testid={`item-notes-${idx}`}
            />
          </div>
        ))}
      </div>

      <button type="button" onClick={addItem} className="flex items-center gap-2 text-sm font-semibold text-[#20364D] hover:text-[#2d4a66]" data-testid="add-promo-item-btn">
        <Plus className="w-4 h-4" /> Add Another Item
      </button>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Overall Branding Notes</label>
        <textarea
          value={brandingNotes}
          onChange={(e) => setBrandingNotes(e.target.value)}
          placeholder="General branding instructions, color codes, logo files, deadlines..."
          className="w-full border rounded-xl px-4 py-3 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
          data-testid="branding-notes-input"
        />
      </div>

      <button type="submit" disabled={submitting} className="w-full py-3 bg-[#20364D] text-white rounded-xl font-semibold text-sm disabled:opacity-40 transition flex items-center justify-center gap-2" data-testid="submit-promo-request-btn">
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Send className="w-4 h-4" /> Submit Promotional Request</>}
      </button>
    </form>
  );
}
