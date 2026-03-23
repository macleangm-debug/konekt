import React, { createContext, useContext, useMemo, useState } from "react";

const CartDrawerContext = createContext(null);

export function CartDrawerProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);

  const addItem = (item) => {
    setItems((prev) => [...prev, item]);
    setOpen(true);
  };

  const removeItem = (key) => {
    setItems((prev) => prev.filter((_, idx) => `row-${idx}` !== key));
  };

  const clearCart = () => {
    setItems([]);
  };

  const value = useMemo(() => ({
    open, items, setOpen, addItem, removeItem, clearCart,
    openCart: () => setOpen(true),
    closeCart: () => setOpen(false),
    cartCount: items.length,
  }), [open, items]);

  return <CartDrawerContext.Provider value={value}>{children}</CartDrawerContext.Provider>;
}

export function useCartDrawer() {
  const ctx = useContext(CartDrawerContext);
  if (!ctx) throw new Error("useCartDrawer must be used inside CartDrawerProvider");
  return ctx;
}
