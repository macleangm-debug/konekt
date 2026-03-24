import React from "react";
import { X, ShoppingCart } from "lucide-react";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

export default function ProductOrPromoDetailModal({ item, open, onClose, onAddToCart }) {
  if (!open || !item) return null;

  const colors = item.colors || item.available_colors || [];
  const sizes = item.sizes || item.available_sizes || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="product-detail-modal">
      <div className="w-full max-w-[760px] rounded-[2rem] bg-white p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-[#20364D]">{item.name}</h2>
            {item.group_name && <p className="text-sm text-slate-500 mt-1">{item.group_name}{item.subgroup_name ? ` / ${item.subgroup_name}` : ""}</p>}
            <p className="text-slate-600 mt-2">{item.description || item.short_description || "Product details and purchasing information."}</p>
          </div>
          <button onClick={onClose} data-testid="close-detail-modal" className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-[#20364D] hover:bg-slate-50 transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <div className="rounded-2xl bg-slate-100 min-h-[240px] flex items-center justify-center overflow-hidden">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <span className="text-slate-400 text-sm">Product Image</span>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-3xl font-bold text-[#20364D]">{money(item.price || item.unit_price)}</p>
              {item.unit_label && <p className="text-sm text-slate-500 mt-0.5">per {item.unit_label}</p>}
            </div>

            {colors.length > 0 && (
              <div>
                <p className="text-sm text-slate-500 font-medium mb-2">Colors</p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c, idx) => {
                    const colorName = typeof c === 'object' ? (c.name || c.color || JSON.stringify(c)) : c;
                    const colorKey = typeof c === 'object' ? (c.name || c.hex || idx) : c;
                    return (
                      <span key={colorKey} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-[#20364D] hover:bg-slate-50 cursor-pointer">{colorName}</span>
                    );
                  })}
                </div>
              </div>
            )}

            {sizes.length > 0 && (
              <div>
                <p className="text-sm text-slate-500 font-medium mb-2">Sizes</p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s, idx) => {
                    const sizeName = typeof s === 'object' ? (s.name || s.size || JSON.stringify(s)) : s;
                    const sizeKey = typeof s === 'object' ? (s.name || s.id || idx) : s;
                    return (
                      <span key={sizeKey} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-[#20364D] hover:bg-slate-50 cursor-pointer">{sizeName}</span>
                    );
                  })}
                </div>
              </div>
            )}

            {item.min_order_quantity && (
              <p className="text-sm text-slate-500">Min order: {item.min_order_quantity} {item.unit_label || "pcs"}</p>
            )}

            <button
              data-testid="modal-add-to-cart-btn"
              onClick={() => { onAddToCart?.(item); onClose(); }}
              className="w-full rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a66] transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingCart size={16} /> Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
