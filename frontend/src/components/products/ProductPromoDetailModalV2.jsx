import React, { useState } from "react";
import { X, ShoppingCart, ChevronLeft, ChevronRight, Palette, FileText } from "lucide-react";
import { useCartDrawer } from "../../contexts/CartDrawerContext";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../lib/api";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

export default function ProductPromoDetailModalV2({ item, open, onClose, isPromo = false }) {
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [brief, setBrief] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { addItem } = useCartDrawer();
  const { user } = useAuth();

  if (!open || !item) return null;

  const price = item.price ?? item.base_price ?? item.blank_unit_price ?? item.unit_price ?? 0;
  const images = item.images || item.variant_images || (item.image_url ? [item.image_url] : item.primary_image ? [item.primary_image] : []);
  const colors = (item.colors || item.available_colors || []).map(c => typeof c === "object" ? (c.name || c.color || JSON.stringify(c)) : c);
  const sizes = (item.sizes || item.available_sizes || []).map(s => typeof s === "object" ? (s.name || s.size || JSON.stringify(s)) : s);

  const prevImage = () => setActiveImage((p) => (p - 1 + images.length) % images.length);
  const nextImage = () => setActiveImage((p) => (p + 1) % images.length);

  const handleAddToCart = () => {
    addItem({ ...item, price: Number(price), quantity });
    onClose();
  };

  const handleRequestQuote = async () => {
    setSubmitting(true);
    try {
      await api.post("/api/admin-flow-fixes/promo/request-customization-quote", {
        customer_id: user?.id || "guest",
        item_id: item.id,
        item_name: item.name,
        selected_color: selectedColor,
        selected_size: selectedSize,
        blank_unit_price: Number(price),
        quantity,
        customization_brief: brief,
      });
      setSubmitted(true);
    } catch (err) {
      alert("Failed: " + (err.response?.data?.detail || err.message));
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="product-detail-modal">
        <div className="w-full max-w-[500px] rounded-[2rem] bg-white p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <FileText size={28} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#20364D]">Customization Request Sent</h2>
          <p className="text-slate-600">Our sales team will review your brief and prepare a custom quote for <strong>{item.name}</strong>.</p>
          <button onClick={() => { setSubmitted(false); onClose(); }} data-testid="close-detail-modal"
            className="rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold hover:bg-[#2a4a66] transition-colors">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="product-detail-modal">
      <div className="w-full max-w-[900px] rounded-[2rem] bg-white p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-[#20364D]">{item.name}</h2>
            {item.group_name && <p className="text-sm text-slate-500 mt-1">{item.group_name}{item.subgroup_name ? ` / ${item.subgroup_name}` : ""}</p>}
          </div>
          <button onClick={onClose} data-testid="close-detail-modal"
            className="rounded-xl border border-slate-200 p-2.5 text-[#20364D] hover:bg-slate-50 transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mt-6">
          {/* Image carousel */}
          <div>
            <div className="rounded-2xl bg-slate-100 aspect-[4/3] overflow-hidden flex items-center justify-center relative group">
              {images.length > 0 ? (
                <img src={images[activeImage]} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <Palette size={40} className="text-slate-300" />
              )}
              {images.length > 1 && (
                <>
                  <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {images.map((src, idx) => (
                  <button key={idx} onClick={() => setActiveImage(idx)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-colors ${activeImage === idx ? "border-[#20364D]" : "border-transparent hover:border-slate-300"}`}>
                    <img src={src} alt={`Variation ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-5">
            <div>
              <p className="text-3xl font-bold text-[#20364D]" data-testid="modal-price">{money(price)}</p>
              {item.unit_label && <p className="text-sm text-slate-500 mt-0.5">per {item.unit_label}</p>}
              {isPromo && <p className="text-xs text-amber-600 mt-1 font-medium">Blank price — customization quoted separately</p>}
            </div>

            {item.description && <p className="text-slate-600 text-sm">{item.description}</p>}

            {colors.length > 0 && (
              <div>
                <p className="text-sm text-slate-500 font-medium mb-2">Colors {selectedColor && <span className="text-[#20364D]">— {selectedColor}</span>}</p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <button key={c} onClick={() => setSelectedColor(c)} data-testid={`color-${c}`}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${selectedColor === c ? "bg-[#20364D] text-white border-[#20364D]" : "text-[#20364D] border-slate-200 hover:border-[#20364D]"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sizes.length > 0 && (
              <div>
                <p className="text-sm text-slate-500 font-medium mb-2">Sizes {selectedSize && <span className="text-[#20364D]">— {selectedSize}</span>}</p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => (
                    <button key={s} onClick={() => setSelectedSize(s)} data-testid={`size-${s}`}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${selectedSize === s ? "bg-[#20364D] text-white border-[#20364D]" : "text-[#20364D] border-slate-200 hover:border-[#20364D]"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {item.min_order_quantity && (
              <p className="text-xs text-slate-500">Min order: {item.min_order_quantity} {item.unit_label || "pcs"}</p>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-500 font-medium">Qty</p>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2 hover:bg-slate-50 text-[#20364D] font-bold">-</button>
                <input value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  className="w-14 text-center py-2 border-x border-slate-200 font-semibold text-[#20364D]" />
                <button onClick={() => setQuantity(quantity + 1)} className="px-3 py-2 hover:bg-slate-50 text-[#20364D] font-bold">+</button>
              </div>
            </div>

            {/* Promo: customization brief */}
            {isPromo && (
              <div>
                <p className="text-sm text-slate-500 font-medium mb-2">Customization Brief</p>
                <textarea value={brief} onChange={(e) => setBrief(e.target.value)}
                  placeholder="Describe your customization needs (logo, text, placement, etc.)"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm min-h-[80px] focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none" />
              </div>
            )}

            {/* Action */}
            {isPromo ? (
              <button data-testid="modal-request-quote-btn" onClick={handleRequestQuote} disabled={submitting}
                className="w-full rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a66] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                <FileText size={16} /> {submitting ? "Submitting..." : "Request Customization Quote"}
              </button>
            ) : (
              <button data-testid="modal-add-to-cart-btn" onClick={handleAddToCart}
                className="w-full rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a66] transition-colors flex items-center justify-center gap-2">
                <ShoppingCart size={16} /> Add to Cart
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
