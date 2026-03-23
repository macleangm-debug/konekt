import React, { useState } from "react";
import { X, ShoppingCart, Trash2 } from "lucide-react";
import { useCartDrawer } from "../../contexts/CartDrawerContext";
import SalesAssistModalV2 from "../modals/SalesAssistModalV2";
import CheckoutPanel from "../checkout/CheckoutPanel";

export default function CartDrawerV2() {
  const { open, items, closeCart, removeItem, clearCart } = useCartDrawer();
  const [assistOpen, setAssistOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  if (!open && !checkoutOpen) return null;

  const total = items.reduce((sum, item) => sum + Number(item.price || item.numericPrice || item.base_price || 0), 0);

  const handleCheckoutComplete = (data) => {
    setCheckoutOpen(false);
    clearCart();
    closeCart();
  };

  // If checkout panel is open, show it instead of cart
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
        <button 
          className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
          onClick={closeCart} 
          aria-label="Close cart overlay" 
        />
        <div className="relative w-full max-w-[430px] h-full bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#1f3a5f]/10 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-[#1f3a5f]" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-[#0f172a]">Your Cart</div>
                  <div className="text-xs text-[#94a3b8]">{items.length} item{items.length !== 1 ? "s" : ""}</div>
                </div>
              </div>
              <button 
                onClick={closeCart} 
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-[#f8fafc] transition-colors"
                data-testid="close-cart-btn"
              >
                <X className="w-4 h-4 text-[#64748b]" />
              </button>
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {items.map((item, idx) => (
              <div key={`row-${idx}`} className="rounded-xl bg-[#f8fafc] border border-gray-100 p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#0f172a] truncate">{item.name}</div>
                  <div className="text-xs text-[#94a3b8] mt-0.5">
                    {item.group_name || item.category || item.branch || ""}
                  </div>
                  <div className="text-sm font-semibold text-[#0f172a] mt-1.5">
                    TZS {Number(item.price || item.numericPrice || item.base_price || 0).toLocaleString()}
                  </div>
                </div>
                <button 
                  onClick={() => removeItem(`row-${idx}`)} 
                  className="p-1.5 rounded-md hover:bg-red-50 text-red-500 transition-colors"
                  data-testid={`remove-item-${idx}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {!items.length && (
              <div className="text-center py-16">
                <ShoppingCart className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <div className="text-sm text-[#64748b]">Your cart is empty</div>
                <div className="text-xs text-[#94a3b8] mt-1">Browse products to add items</div>
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-gray-100 p-6 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-[#64748b]">Estimated Total</div>
                <div className="text-xl font-semibold text-[#0f172a]">TZS {total.toLocaleString()}</div>
              </div>

              {/* Primary CTA - Checkout */}
              <button 
                onClick={() => setCheckoutOpen(true)}
                className="w-full bg-[#0f172a] text-white py-3.5 rounded-lg text-sm font-semibold hover:bg-[#1e293b] transition-all hover:-translate-y-0.5 hover:shadow-md"
                data-testid="checkout-btn"
              >
                Checkout
              </button>

              {/* Secondary - Sales Assist */}
              <button 
                onClick={() => setAssistOpen(true)} 
                className="w-full border border-gray-200 text-[#0f172a] py-3 rounded-lg text-sm font-medium hover:bg-[#f8fafc] transition-colors"
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
