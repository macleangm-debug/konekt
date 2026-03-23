import React from "react";
import { Link } from "react-router-dom";

export default function AccountProductDetailContent({ product, onAddToCart }) {
  if (!product) return null;

  return (
    <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-8">
      <div className="rounded-[2rem] border bg-white p-6">
        <div className="aspect-[4/3] rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
          Product Image
        </div>
      </div>

      <div className="rounded-[2rem] border bg-white p-8">
        <div className="text-3xl font-bold text-[#20364D]">{product.name}</div>
        <div className="text-slate-500 mt-2">{product.category}</div>
        <div className="text-2xl font-bold text-[#20364D] mt-5">{product.price}</div>
        <p className="text-slate-600 mt-5 leading-7">{product.description}</p>

        <div className="grid md:grid-cols-2 gap-3 mt-8">
          <button type="button" onClick={() => onAddToCart?.(product)} className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold">
            Add to Cart
          </button>
          <Link to="/account/assisted-cart" className="rounded-xl bg-[#F4E7BF] text-[#8B6A10] px-5 py-3 font-semibold text-center">
            Let Sales Assist Me
          </Link>
        </div>
      </div>
    </div>
  );
}
