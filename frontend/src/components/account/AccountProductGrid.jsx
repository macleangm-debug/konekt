import React from "react";
import { Link } from "react-router-dom";

export default function AccountProductGrid({ products = [], onAddToCart }) {
  return (
    <div className="grid xl:grid-cols-3 md:grid-cols-2 gap-6">
      {products.map((product) => (
        <div key={product.id} className="rounded-[2rem] border bg-white p-5">
          <div className="aspect-[4/3] rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            Product Image
          </div>

          <div className="mt-5">
            <div className="text-lg font-bold text-[#20364D]">{product.name}</div>
            <div className="text-sm text-slate-500 mt-1">{product.category}</div>
            <div className="text-xl font-bold text-[#20364D] mt-4">{product.price}</div>
          </div>

          <div className="flex gap-3 mt-5">
            <Link to={`/account/marketplace/${product.id}`} className="flex-1 rounded-xl border px-4 py-3 text-center font-semibold text-[#20364D]">
              View
            </Link>
            <button type="button" onClick={() => onAddToCart?.(product)} className="flex-1 rounded-xl bg-[#20364D] text-white px-4 py-3 font-semibold">
              Add to Cart
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
