import React, { useState } from "react";
import { X, ShoppingCart, Trash2, Sparkles, ShieldCheck } from "lucide-react";
import { useCartDrawer } from "../../contexts/CartDrawerContext";
import SalesAssistModalV2 from "../modals/SalesAssistModalV2";
import CheckoutPanel from "../checkout/CheckoutPanel";
import BrandLogo from "../branding/BrandLogo";

export default function CartDrawerV2() {
  const { open, items, closeCart, removeItem, clearCart } = useCartDrawer();
  const [assistOpen, setAssistOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  if (!open && !checkoutOpen) return null;

  const total = items.reduce((sum, item) => sum + Number(item.price || item.numericPrice || item.base_price || 0), 0);

  const handleCheckoutComplete = () => {
    setCheckoutOpen(false);
    clearCart();
    closeCart();
  };

  if (checkoutOpen) {
    return (
      <CheckoutPanel
        items={items}
        total={total}
        onClose={() => setCheckoutOpen(false)}
        onComplete={handleCheckoutComplete}
      />
    );
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end" data-testid="cart-drawer">
        <button className="absolute inset-0 bg-[#0f172a]/45 backdrop-blur-sm" onClick={closeCart} aria-label="Close cart overlay" />
        <div className="relative w-full max-w-[440px] h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-br from-[#20364D] via-[#294B68] to-[#D4A843] px-6 py-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-4">
                <BrandLogo size="sm" variant="light" />
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center border border-white/10">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold">Your Cart</div>
                    <div className="text-sm text-white/80">{items.length} item{items.length !== 1 ? "s" : ""} ready for checkout</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/80">
                  <span className="inline-flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Fast checkout</span>
                  <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Secure payment review</span>
                </div>
              </div>
              <button
                onClick={closeCart}
                className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center hover:bg-white/20 transition-colors"
                data-testid="close-cart-btn"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/70">
            {items.map((item, idx) => (
              <div key={`row-${idx}`} className="rounded-2xl bg-white border border-slate-200 p-4 flex items-start justify-between gap-3 shadow-sm">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#0f172a] truncate">{item.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{item.group_name || item.category || item.branch || "Marketplace item"}</div>
                  <div className="inline-flex items-center mt-2 rounded-full bg-[#D4A843]/10 text-[#8B6A14] text-xs px-2.5 py-1">Qty {item.quantity || 1}</div>
                  <div className="text-base font-bold text-[#20364D] mt-2">TZS {Number(item.price || item.numericPrice || item.base_price || 0).toLocaleString()}</div>
                </div>
                <button
                  onClick={() => removeItem(`row-${idx}`)}
                  className="p-2 rounded-xl hover:bg-red-50 text-red-500 transition-colors"
                  data-testid={`remove-item-${idx}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {!items.length && (
              <div className="text-center py-16">
                <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <div className="text-sm text-slate-600">Your cart is empty</div>
                <div className="text-xs text-slate-400 mt-1">Browse products to add items</div>
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="border-t border-slate-200 p-6 bg-white space-y-4 shadow-[0_-10px_30px_rgba(15,23,42,0.04)]">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">Estimated Total</div>
                  <div className="text-xs text-slate-400 mt-1">VAT included where applicable</div>
                </div>
                <div className="text-2xl font-bold text-[#20364D]">TZS {total.toLocaleString()}</div>
              </div>

              <button
                onClick={() => setCheckoutOpen(true)}
                className="w-full bg-[#20364D] text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-[#2a4a66] transition-all hover:-translate-y-0.5 hover:shadow-md"
                data-testid="checkout-btn"
              >
                Checkout
              </button>

              <button
                onClick={() => setAssistOpen(true)}
                className="w-full border border-[#D4A843]/40 text-[#8B6A14] bg-[#FFF8E8] py-3 rounded-xl text-sm font-medium hover:bg-[#FFF1CC] transition-colors"
                data-testid="sales-assist-btn"
              >
                Let Sales Assist
              </button>
            </div>
          )}
        </div>
      </div>

      <SalesAssistModalV2 open={assistOpen} onClose={() => setAssistOpen(false)} contextType="cart" contextItems={items} />
    </>
  );
}
