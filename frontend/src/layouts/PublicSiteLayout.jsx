import React from "react";
import { Outlet } from "react-router-dom";
import { CartProvider } from "../contexts/CartContext";
import PublicNavbarV2 from "../components/public/PublicNavbarV2";
import PremiumFooterV2 from "../components/public/PremiumFooterV2";
import FirstOrderDiscountModal from "../components/public/FirstOrderDiscountModal";

export default function PublicSiteLayout() {
  return (
    <CartProvider>
      <div className="bg-white min-h-screen text-slate-900" data-testid="public-site-layout">
        <PublicNavbarV2 />
        <main className="min-h-[60vh]">
          <Outlet />
        </main>
        <PremiumFooterV2 />
        <FirstOrderDiscountModal />
      </div>
    </CartProvider>
  );
}
