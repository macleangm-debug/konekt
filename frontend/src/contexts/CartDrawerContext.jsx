import React, { createContext, useContext, useMemo, useState } from "react";

const CartDrawerContext = createContext(null);

export function CartDrawerProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);

  const addItem = (item) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) =>
          p.id === item.id ? { ...p, quantity: (p.quantity || 1) + 1 } : p
        );
      }
      return [...prev, { ...item, quantity: 1 }];
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
    cartCount: items.reduce((sum, item) => sum + (item.quantity || 1), 0),
  }), [open, items]);

  return <CartDrawerContext.Provider value={value}>{children}</CartDrawerContext.Provider>;
}

export function useCartDrawer() {
  const ctx = useContext(CartDrawerContext);
  if (!ctx) throw new Error("useCartDrawer must be used inside CartDrawerProvider");
  return ctx;
}
