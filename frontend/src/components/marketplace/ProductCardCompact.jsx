import React from "react";
import { Package, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useCartDrawer } from "../../contexts/CartDrawerContext";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString()}`;
}

export default function ProductCardCompact({ product, onDetail, isPromo = false }) {
  const { addItem } = useCartDrawer();
  const originalPrice = product?.price ?? product?.base_price ?? product?.blank_unit_price ?? product?.unit_price ?? 0;
  const promo = product?.promotion;
  const price = promo ? promo.promo_price : Number(originalPrice);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group" data-testid={`product-card-${product?.id}`}>
      <div className="relative">
        <button className="aspect-[4/3] bg-[#f8fafc] overflow-hidden flex items-center justify-center w-full" onClick={() => onDetail?.(product)}>
          {(product?.image_url || product?.primary_image) ? (
            <img src={product.image_url || product.primary_image} alt={product.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-300" />
          ) : (
            <Package className="w-8 h-8 text-gray-300" />
          )}
        </button>
        {promo && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-sm" data-testid={`promo-badge-${product?.id}`}>
            {promo.discount_label}
          </span>
        )}
      </div>
      <div className="p-3">
        <button onClick={() => onDetail?.(product)} className="text-sm font-semibold text-[#0f172a] leading-5 line-clamp-2 text-left hover:underline">{product?.name}</button>
        <div className="text-xs text-[#94a3b8] mt-1">{product?.category || product?.category_name || product?.branch || ""}</div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div>
            <span className="text-sm font-semibold text-[#0f172a]">{money(price)}</span>
            {promo && (
              <span className="text-xs text-slate-400 line-through ml-1.5">{money(originalPrice)}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Link to={`/marketplace/${product?.slug || product?.id}`}
              className="rounded-lg border border-slate-200 text-slate-500 px-2 py-1.5 text-xs hover:bg-slate-50 transition-colors"
              data-testid={`view-detail-${product?.id}`}>
              Detail
            </Link>
            {isPromo ? (
            <button
              onClick={() => onDetail?.(product)}
              className="rounded-lg bg-amber-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-amber-700 transition-colors flex items-center gap-1"
              data-testid={`request-quote-${product?.id}`}
            >
              <FileText size={10} /> Quote
            </button>
          ) : (
            <button
              onClick={() => addItem({ ...product, price: Number(price), quantity: 1 })}
              className="rounded-lg bg-[#0f172a] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#1e293b] transition-colors"
              data-testid={`add-to-cart-${product?.id}`}
            >
              Add
            </button>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
