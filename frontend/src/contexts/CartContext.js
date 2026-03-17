import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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

  /**
   * Merge guest cart with existing user cart upon login.
   * This is called after successful authentication.
   * @param {Array} userServerCart - Cart items from user's server-side cart (if any)
   */
  const mergeGuestCart = useCallback((userServerCart = []) => {
    if (!userServerCart || userServerCart.length === 0) {
      // No server cart, keep guest cart as is
      return items;
    }

    // Merge logic: combine guest items with server items
    const mergedCart = [...userServerCart];
    
    items.forEach(guestItem => {
      const existingIndex = mergedCart.findIndex(serverItem => 
        serverItem.product_id === guestItem.product_id &&
        serverItem.size === guestItem.size &&
        serverItem.color === guestItem.color &&
        serverItem.print_method === guestItem.print_method
      );

      if (existingIndex >= 0) {
        // Item exists in server cart, add quantities
        mergedCart[existingIndex] = {
          ...mergedCart[existingIndex],
          quantity: mergedCart[existingIndex].quantity + guestItem.quantity,
          subtotal: (mergedCart[existingIndex].quantity + guestItem.quantity) * mergedCart[existingIndex].unit_price
        };
      } else {
        // New item from guest cart
        mergedCart.push(guestItem);
      }
    });

    setItems(mergedCart);
    return mergedCart;
  }, [items]);

  /**
   * Check if there are items in the guest cart that need merging
   */
  const hasGuestCartItems = useCallback(() => {
    const token = localStorage.getItem('token');
    return !token && items.length > 0;
  }, [items]);

  /**
   * Get the current cart for checkout - validates items still exist
   */
  const getCartForCheckout = useCallback(() => {
    return {
      items: items,
      total: items.reduce((sum, item) => sum + item.subtotal, 0),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }, [items]);

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      items, 
      addItem, 
      removeItem, 
      updateQuantity, 
      clearCart, 
      total, 
      itemCount,
      mergeGuestCart,
      hasGuestCartItems,
      getCartForCheckout,
    }}>
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
