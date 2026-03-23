import React, { useState } from "react";
import AccountProductGrid from "../../components/account/AccountProductGrid";

const products = [
  { id: "p1", name: "Executive Office Chair", category: "Office Furniture", price: "TZS 450,000", numericPrice: 450000, description: "Ergonomic office chair for executive workspaces." },
  { id: "p2", name: "A4 Copier Paper Box", category: "Office Supplies", price: "TZS 95,000", numericPrice: 95000, description: "High-quality A4 copier paper, box of reams." },
  { id: "p3", name: "Reception Desk", category: "Furniture", price: "TZS 850,000", numericPrice: 850000, description: "Professional front-office reception desk." },
];

export default function AccountMarketplacePageV2() {
  const [cart, setCart] = useState([]);

  const addToCart = (product) => {
    setCart((prev) => [...prev, product]);
    alert(`${product.name} added to cart.`);
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">Marketplace</div>
        <div className="text-slate-600 mt-2">Browse and add products to cart without leaving your account shell.</div>
      </div>

      <div className="rounded-[2rem] border bg-white p-5 text-sm text-slate-600">
        Cart Preview: {cart.length} item(s)
      </div>

      <AccountProductGrid products={products} onAddToCart={addToCart} />
    </div>
  );
}
