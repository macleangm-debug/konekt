import React, { createContext, useContext, useMemo, useState } from "react";

const CartDrawerContext = createContext(null);

function sameCartItem(a, b) {
  return (
    (a.product_id || a.id || a.slug || a.name) === (b.product_id || b.id || b.slug || b.name) &&
    (a.size || "") === (b.size || "") &&
    (a.color || "") === (b.color || "") &&
    (a.print_method || "") === (b.print_method || "")
  );
}

export function CartDrawerProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);

  const addItem = (item) => {
    setItems((prev) => {
      const idx = prev.findIndex((existing) => sameCartItem(existing, item));
      if (idx >= 0) {
        return prev.map((existing, i) =>
          i === idx ? { ...existing, quantity: Number(existing.quantity || 1) + Number(item.quantity || 1) } : existing
        );
      }
      return [...prev, { ...item, quantity: Number(item.quantity || 1) }];
    });
    setOpen(true);
  };

  const removeItem = (key) => {
    setItems((prev) => prev.filter((_, idx) => `row-${idx}` !== key));
  };

  const clearCart = () => {
    setItems([]);
  };

  const value = useMemo(() => ({
    open, items, setOpen, setItems, addItem, removeItem, clearCart,
    openCart: () => setOpen(true),
    closeCart: () => setOpen(false),
    cartCount: items.reduce((sum, item) => sum + Number(item.quantity || 1), 0),
  }), [open, items]);

  return <CartDrawerContext.Provider value={value}>{children}</CartDrawerContext.Provider>;
}

export function useCartDrawer() {
  const ctx = useContext(CartDrawerContext);
  if (!ctx) throw new Error("useCartDrawer must be used inside CartDrawerProvider");
  return ctx;
}
