import React, { useState } from "react";
import { Link } from "react-router-dom";
import { X, ShoppingCart, Trash2 } from "lucide-react";
import { useCartDrawer } from "../../contexts/CartDrawerContext";
import SalesAssistModalV2 from "../modals/SalesAssistModalV2";

export default function CartDrawerV2() {
  const { open, items, closeCart, removeItem } = useCartDrawer();
  const [assistOpen, setAssistOpen] = useState(false);

  if (!open) return null;

  const total = items.reduce((sum, item) => sum + Number(item.price || item.numericPrice || item.base_price || 0), 0);

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
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#20364D]/10 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-[#20364D]" />
                </div>
                <div>
                  <div className="text-xl font-bold text-[#20364D]">Your Cart</div>
                  <div className="text-sm text-slate-500">{items.length} item(s)</div>
                </div>
              </div>
              <button 
                onClick={closeCart} 
                className="w-10 h-10 rounded-xl border flex items-center justify-center hover:bg-slate-50 transition"
                data-testid="close-cart-btn"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.map((item, idx) => (
              <div key={`row-${idx}`} className="rounded-2xl bg-slate-50 p-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="font-semibold text-[#20364D]">{item.name}</div>
                  <div className="text-sm text-slate-500 mt-1">
                    {item.group_name || item.category || item.branch || ""}
                  </div>
                  <div className="text-sm font-semibold text-[#20364D] mt-2">
                    TZS {Number(item.price || item.numericPrice || item.base_price || 0).toLocaleString()}
                  </div>
                </div>
                <button 
                  onClick={() => removeItem(`row-${idx}`)} 
                  className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition"
                  data-testid={`remove-item-${idx}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {!items.length && (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <div className="text-slate-500">Your cart is empty.</div>
                <div className="text-sm text-slate-400 mt-1">Browse products to add items.</div>
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t p-6 space-y-4 bg-white">
              <div className="flex items-center justify-between">
                <div className="text-slate-500">Estimated Total</div>
                <div className="text-2xl font-bold text-[#20364D]">TZS {total.toLocaleString()}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link 
                  to="/dashboard/checkout" 
                  onClick={closeCart}
                  className="rounded-xl bg-[#20364D] text-white px-4 py-3 text-center font-semibold hover:bg-[#2a4a66] transition"
                  data-testid="checkout-btn"
                >
                  Checkout
                </Link>
                <button 
                  onClick={() => setAssistOpen(true)} 
                  className="rounded-xl bg-[#F4E7BF] text-[#8B6A10] px-4 py-3 font-semibold hover:bg-[#ede0b0] transition"
                  data-testid="sales-assist-btn"
                >
                  Let Sales Assist
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SalesAssistModalV2 open={assistOpen} onClose={() => setAssistOpen(false)} contextType="cart" contextItems={items} />
    </>
  );
}
