import React from "react";
import { useCartDrawer } from "../../contexts/CartDrawerContext";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, Minus, Plus, ArrowRight, ShoppingBag } from "lucide-react";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default function AccountCartPage() {
  const { items, setItems, removeItem, clearCart } = useCartDrawer();
  const navigate = useNavigate();

  const updateQty = (idx, delta) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const newQty = Math.max(1, (Number(item.quantity) || 1) + delta);
        return { ...item, quantity: newQty };
      })
    );
  };

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price || item.unit_price || 0) * Number(item.quantity || 1),
    0
  );

  return (
    <div className="space-y-6" data-testid="account-cart-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">My Cart</h1>
          <p className="text-slate-500 text-sm mt-1">
            {items.length > 0
              ? `${items.length} item${items.length > 1 ? "s" : ""} with current pricing and promotions`
              : "Your cart is empty"}
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs text-red-500 hover:text-red-700 font-medium"
            data-testid="clear-cart-btn"
          >
            Clear Cart
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-lg font-semibold text-slate-600 mb-2">Your cart is empty</p>
          <p className="text-sm text-slate-400 mb-6">Browse the marketplace or reorder from a previous order</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate("/account/marketplace")}
              className="px-5 py-2.5 rounded-lg bg-[#20364D] text-white text-sm font-medium hover:bg-[#2a4a66] transition"
              data-testid="browse-marketplace-btn"
            >
              Browse Marketplace
            </button>
            <button
              onClick={() => navigate("/account/orders")}
              className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
              data-testid="goto-orders-btn"
            >
              My Orders
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {items.map((item, idx) => {
                const unitPrice = Number(item.price || item.unit_price || 0);
                const qty = Number(item.quantity || 1);
                const lineTotal = unitPrice * qty;
                return (
                  <div key={`cart-${idx}`} className="px-6 py-4 flex items-center gap-4" data-testid={`cart-item-${idx}`}>
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#20364D] text-sm truncate">{item.name || "Item"}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {money(unitPrice)} each
                        {item.promo_applied && (
                          <span className="ml-2 text-emerald-600 font-medium">{item.promo_label}</span>
                        )}
                        {item.size && <span className="ml-2">Size: {item.size}</span>}
                        {item.color && <span className="ml-2">Color: {item.color}</span>}
                      </p>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQty(idx, -1)}
                        className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                        data-testid={`qty-minus-${idx}`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium" data-testid={`qty-value-${idx}`}>{qty}</span>
                      <button
                        onClick={() => updateQty(idx, 1)}
                        className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                        data-testid={`qty-plus-${idx}`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="w-28 text-right">
                      <p className="font-semibold text-[#20364D] text-sm">{money(lineTotal)}</p>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeItem(`row-${idx}`)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      data-testid={`remove-item-${idx}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary + Checkout */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-600 font-medium">Subtotal</span>
              <span className="text-lg font-bold text-[#20364D]">{money(subtotal)}</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">VAT and delivery calculated at checkout</p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/account/checkout")}
                className="flex-1 py-3 rounded-lg bg-[#20364D] text-white text-sm font-semibold hover:bg-[#2a4a66] transition flex items-center justify-center gap-2"
                data-testid="proceed-to-checkout-btn"
              >
                Proceed to Checkout <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate("/account/marketplace")}
                className="px-4 py-3 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
                data-testid="continue-shopping-btn"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
