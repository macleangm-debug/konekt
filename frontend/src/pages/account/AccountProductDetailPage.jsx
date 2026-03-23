import React from "react";
import AccountProductDetailContent from "../../components/account/AccountProductDetailContent";

const product = {
  id: "p1",
  name: "Executive Office Chair",
  category: "Office Furniture",
  price: "TZS 450,000",
  numericPrice: 450000,
  description: "Ergonomic office chair for executive workspaces with a premium finish.",
};

export default function AccountProductDetailPage() {
  const addToCart = () => alert("Added to cart.");

  return (
    <div className="space-y-8">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">Product Detail</div>
        <div className="text-slate-600 mt-2">Review product details and order without leaving your account shell.</div>
      </div>

      <AccountProductDetailContent product={product} onAddToCart={addToCart} />
    </div>
  );
}
