import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('konekt_cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('konekt_cart', JSON.stringify(items));
  }, [items]);

  const addItem = (item) => {
    setItems(prev => {
      const existing = prev.find(i => 
        i.product_id === item.product_id && 
        i.size === item.size && 
        i.color === item.color &&
        i.print_method === item.print_method
      );
      
      if (existing) {
        return prev.map(i => 
          i === existing 
            ? { ...i, quantity: i.quantity + item.quantity, subtotal: (i.quantity + item.quantity) * i.unit_price }
            : i
        );
      }
      
      return [...prev, { ...item, id: Date.now().toString() }];
    });
  };

  const removeItem = (itemId) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity < 1) return;
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, quantity, subtotal: quantity * item.unit_price }
        : item
    ));
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
