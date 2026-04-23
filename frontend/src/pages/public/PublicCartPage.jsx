import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Package, ArrowLeft } from "lucide-react";
import { useCart } from "../../contexts/CartContext";
import { toast } from "sonner";
import SalesAssistCtaCard from "../../components/marketplace/SalesAssistCtaCard";
import SalesAssistModal from "../../components/marketplace/SalesAssistModal";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

export default function PublicCartPage() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, total, itemCount } = useCart();
  const [showSalesAssist, setShowSalesAssist] = useState(false);

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center" data-testid="empty-cart">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
          <ShoppingCart className="w-10 h-10 text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold text-[#20364D]">Your cart is empty</h1>
        <p className="text-slate-500 mt-2">Browse our marketplace and add products to get started.</p>
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 mt-6 rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold hover:bg-[#17283c] transition"
          data-testid="browse-marketplace-btn"
        >
          Browse Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8" data-testid="public-cart-page">
      <button
        onClick={() => navigate("/marketplace")}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#20364D] mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Continue Shopping
      </button>

      <h1 className="text-2xl font-bold text-[#20364D] mb-6">
        Shopping Cart <span className="text-slate-400 font-normal text-lg">({itemCount} items)</span>
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border bg-white p-4 flex gap-4"
              data-testid={`cart-item-${item.id}`}
            >
              <div className="w-20 h-20 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-8 h-8 text-slate-300" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#20364D] text-sm truncate">{item.product_name}</h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  {item.category && <span>{item.category}</span>}
                  {item.size && <span> · {item.size}</span>}
                  {item.color && <span> · {item.color}</span>}
                </div>
                <p className="text-sm font-medium text-slate-700 mt-1">
                  {money(item.unit_price)} each
                  {item.original_unit_price && item.original_unit_price > item.unit_price && (
                    <span className="ml-2 text-xs text-slate-400 line-through" data-testid={`cart-item-${item.id}-original`}>
                      {money(item.original_unit_price)}
                    </span>
                  )}
                </p>
                {item.original_unit_price && item.original_unit_price > item.unit_price && (
                  <p className="text-[11px] font-bold text-red-600 mt-0.5" data-testid={`cart-item-${item.id}-savings`}>
                    Save {money((item.original_unit_price - item.unit_price) * item.quantity)}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center border rounded-lg overflow-hidden">
                    <button
                      onClick={() => {
                        if (item.quantity <= 1) {
                          removeItem(item.id);
                          toast.info(`${item.product_name} removed`);
                        } else {
                          updateQuantity(item.id, item.quantity - 1);
                        }
                      }}
                      className="px-3 py-1.5 hover:bg-slate-100 transition"
                      data-testid={`qty-minus-${item.id}`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 py-1.5 text-sm font-medium min-w-[36px] text-center" data-testid={`qty-val-${item.id}`}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-3 py-1.5 hover:bg-slate-100 transition"
                      data-testid={`qty-plus-${item.id}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => { removeItem(item.id); toast.info(`${item.product_name} removed`); }}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    data-testid={`remove-item-${item.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <span className="font-bold text-[#20364D]">{money(item.subtotal)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div>
          <div className="rounded-2xl border bg-white p-6 sticky top-24" data-testid="cart-summary">
            <h2 className="text-lg font-bold text-[#20364D] mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm">
              {(() => {
                const items_local = items || [];
                const totalSavings = items_local.reduce((acc, it) => {
                  if (it.original_unit_price && it.original_unit_price > it.unit_price) {
                    return acc + (it.original_unit_price - it.unit_price) * it.quantity;
                  }
                  return acc;
                }, 0);
                const preDiscountSubtotal = (total || 0) + totalSavings;
                const VAT_RATE = 0.18; // Tanzania standard VAT 18%
                const vatAmount = Math.round((total || 0) * VAT_RATE);
                const grandTotal = (total || 0) + vatAmount;
                return (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal ({itemCount} items)</span>
                      <span>{money(preDiscountSubtotal)}</span>
                    </div>
                    {totalSavings > 0 && (
                      <div className="flex justify-between text-red-600 font-semibold" data-testid="cart-total-savings">
                        <span>Your savings</span>
                        <span>-{money(totalSavings)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal after savings</span>
                      <span>{money(total)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>VAT (18%)</span>
                      <span>{money(vatAmount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Shipping</span>
                      <span>Calculated at checkout</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-bold text-lg text-[#20364D]">
                      <span>Total (incl. VAT)</span>
                      <span>{money(grandTotal)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
            <button
              onClick={() => navigate("/checkout")}
              className="w-full mt-6 rounded-xl bg-[#D4A843] text-[#17283C] px-6 py-3.5 font-semibold hover:bg-[#c49a3d] transition flex items-center justify-center gap-2"
              data-testid="proceed-to-checkout-btn"
            >
              Proceed to Checkout <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-xs text-center text-slate-400 mt-3">No account required to checkout</p>
          </div>
          <div className="mt-4">
            <SalesAssistCtaCard
              title="Need help finalizing this order?"
              body="Our sales team can help with quantities, custom pricing, and service requests."
              onClick={() => setShowSalesAssist(true)}
              compact
            />
          </div>
        </div>
      </div>
      <SalesAssistModal
        isOpen={showSalesAssist}
        onClose={() => setShowSalesAssist(false)}
        productName={items.map(i => i.product_name || i.name).filter(Boolean).join(", ")}
        source="cart_sales_assist"
      />
    </div>
  );
}
