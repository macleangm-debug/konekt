import React from "react";
import { ShoppingCart } from "lucide-react";
import { useCartDrawer } from "../../contexts/CartDrawerContext";

export default function CartTopbarButton() {
  const { items, openCart } = useCartDrawer();
  const totalQty = (items || []).reduce((sum, item) => sum + Number(item.quantity || 1), 0);

  return (
    <button
      type="button"
      onClick={openCart}
      className="relative flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#0f172a] hover:bg-[#f8fafc] transition-colors"
      aria-label="Open cart"
      data-testid="cart-topbar-btn"
    >
      <ShoppingCart className="w-4 h-4" />
      <span className="hidden sm:inline">Cart</span>
      {totalQty > 0 && (
        <span className="absolute -top-2 -right-2 min-w-[20px] h-5 rounded-full bg-[#0f172a] text-white text-[11px] font-semibold flex items-center justify-center px-1">
          {totalQty}
        </span>
      )}
    </button>
  );
}
