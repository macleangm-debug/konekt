import React from "react";
import { Link } from "react-router-dom";

export default function AccountProductGrid({ products = [], onAddToCart }) {
  const fmt = (v) => `TZS ${Number(v || 0).toLocaleString()}`;

  return (
    <div className="grid xl:grid-cols-3 md:grid-cols-2 gap-6" data-testid="product-grid">
      {products.map((product) => {
        const promo = product?.promotion;
        const originalPrice = product?.selling_price || product?.price || product?.base_price || 0;
        const displayPrice = promo ? promo.promo_price : originalPrice;

        return (
          <div key={product.id} className="rounded-[2rem] border bg-white p-5 relative" data-testid={`product-card-${product.id}`}>
            {promo && (
              <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-bold shadow-sm z-10" data-testid={`promo-badge-${product.id}`}>
                {promo.discount_label}
              </span>
            )}
            <div className="aspect-[4/3] rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                "Product Image"
              )}
            </div>

            <div className="mt-5">
              <div className="text-lg font-bold text-[#20364D]">{product.name}</div>
              <div className="text-sm text-slate-500 mt-1">{product.category}</div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-xl font-bold text-[#20364D]">{fmt(displayPrice)}</span>
                {promo && (
                  <span className="text-sm text-slate-400 line-through">{fmt(originalPrice)}</span>
                )}
              </div>
              {promo && (
                <p className="text-xs text-emerald-600 font-medium mt-1">Save {fmt(promo.discount_amount)}</p>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <Link to={`/account/marketplace/${product.id}`} className="flex-1 rounded-xl border px-4 py-3 text-center font-semibold text-[#20364D]">
                View
              </Link>
              <button 
                type="button" 
                onClick={() => onAddToCart?.(product)} 
                className="flex-1 rounded-xl bg-[#20364D] text-white px-4 py-3 font-semibold"
                data-testid={`add-to-cart-${product.id}`}
              >
                Add to Cart
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
