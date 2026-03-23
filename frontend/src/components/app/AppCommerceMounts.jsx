import React from "react";
import CartDrawerV2 from "../cart/CartDrawerV2";
import { CartDrawerProvider } from "../../contexts/CartDrawerContext";

/**
 * AppCommerceMounts - Wrapper component that provides cart drawer functionality
 * Wrap your account/dashboard layout with this to enable:
 * - Cart drawer context
 * - Cart drawer UI
 */
export default function AppCommerceMounts({ children }) {
  return (
    <CartDrawerProvider>
      {children}
      <CartDrawerV2 />
    </CartDrawerProvider>
  );
}
