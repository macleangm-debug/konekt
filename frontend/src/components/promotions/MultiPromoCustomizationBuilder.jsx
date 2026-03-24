import React, { useState } from "react";
import api from "../../lib/api";
import { Plus, Trash2, FileText, Package } from "lucide-react";

function emptyItem() {
  return { item_id: "", item_name: "", selected_color: "", selected_size: "", quantity: 1 };
}

export default function MultiPromoCustomizationBuilder({ customerId = "demo-customer", promoProducts = [], onSubmitted }) {
  const [items, setItems] = useState([emptyItem()]);
  const [customizationBrief, setCustomizationBrief] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const updateItem = (idx, patch) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, ...patch } : item));
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const selectProduct = (idx, product) => {
    updateItem(idx, {
      item_id: product.id,
      item_name: product.name,
      selected_color: "",
      selected_size: "",
    });
  };

  const submit = async () => {
    const validItems = items.filter(i => i.item_name.trim());
    if (validItems.length === 0) return alert("Please add at least one item");
    setSubmitting(true);
    try {
      await api.post("/api/multi-request/promo-bundle", {
        customer_id: customerId,
        items: validItems,
        customization_brief: customizationBrief,
      });
      setSubmitted(true);
      onSubmitted?.();
    } catch (err) {
      alert("Failed: " + (err.response?.data?.detail || err.message));
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center space-y-4" data-testid="promo-bundle-success">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <FileText size={28} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-[#20364D]">Customization Request Sent</h2>
        <p className="text-slate-600">Our sales team will review your {items.filter(i => i.item_name).length} item(s) and prepare a custom quote.</p>
        <button onClick={() => { setSubmitted(false); setItems([emptyItem()]); setCustomizationBrief(""); }} data-testid="promo-bundle-reset"
          className="rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold hover:bg-[#2a4a66] transition-colors">New Request</button>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 space-y-5" data-testid="multi-promo-builder">
      <div>
        <h2 className="text-2xl font-bold text-[#20364D]">Customize Promotional Items</h2>
        <p className="text-slate-500 mt-1 text-sm">Bundle pens, umbrellas, t-shirts and more into one customization quote request.</p>
      </div>

      {items.map((item, idx) => (
        <div key={idx} className="rounded-2xl border border-slate-200 p-4 space-y-3" data-testid={`promo-item-${idx}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Item {idx + 1}</span>
            {items.length > 1 && (
              <button onClick={() => removeItem(idx)} data-testid={`remove-promo-item-${idx}`}
                className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>
            )}
          </div>
          {promoProducts.length > 0 ? (
            <select className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" value={item.item_id}
              onChange={(e) => { const p = promoProducts.find(pp => pp.id === e.target.value); if (p) selectProduct(idx, p); }}
              data-testid={`promo-item-select-${idx}`}>
              <option value="">Select a promotional item</option>
              {promoProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          ) : (
            <input className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" placeholder="Item Name (e.g., Branded Pen)" value={item.item_name} onChange={(e) => updateItem(idx, { item_name: e.target.value })} data-testid={`promo-item-name-${idx}`} />
          )}
          <div className="grid grid-cols-3 gap-3">
            <input className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" placeholder="Color" value={item.selected_color} onChange={(e) => updateItem(idx, { selected_color: e.target.value })} data-testid={`promo-color-${idx}`} />
            <input className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" placeholder="Size" value={item.selected_size} onChange={(e) => updateItem(idx, { selected_size: e.target.value })} data-testid={`promo-size-${idx}`} />
            <input type="number" min="1" className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, { quantity: Math.max(1, Number(e.target.value) || 1) })} data-testid={`promo-qty-${idx}`} />
          </div>
        </div>
      ))}

      <button onClick={addItem} data-testid="add-promo-item-btn"
        className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-[#20364D] hover:border-[#20364D] hover:bg-slate-50 transition-colors w-full justify-center">
        <Plus size={16} /> Add Another Item
      </button>

      <div>
        <p className="text-sm font-medium text-slate-500 mb-2">Shared Customization Brief</p>
        <textarea className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm min-h-[120px] focus:ring-2 focus:ring-[#20364D]/20 outline-none" placeholder="Describe your customization needs — logo, text, placement, colors, branding guidelines, etc." value={customizationBrief} onChange={(e) => setCustomizationBrief(e.target.value)} data-testid="promo-brief" />
      </div>

      <button onClick={submit} disabled={submitting} data-testid="submit-promo-bundle-btn"
        className="w-full rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a66] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
        <Package size={16} /> {submitting ? "Submitting..." : "Request Customization Quote"}
      </button>
    </div>
  );
}
