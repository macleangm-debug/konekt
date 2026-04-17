import React from "react";
import { Package, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

const API_BASE = process.env.REACT_APP_BACKEND_URL || "";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString()}`;
}

function resolveImageUrl(src) {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  return `${API_BASE}/api/files/serve/${src}`;
}

/**
 * Unified Product Card — used by BOTH public and in-account marketplaces.
 *
 * STRICT RULES:
 * 1. Card height is identical whether promotion is active or not.
 * 2. Price/promo block always occupies the same vertical space.
 * 3. Action row is always the same height — never pushed down by promo content.
 * 4. Add to Cart is primary. Request Quote / View Details is secondary.
 */
export default function ProductCardCompact({ product, onDetail, onAddToCart, onRequestQuote }) {
  const originalPrice =
    product?.customer_price ?? product?.price ?? product?.base_price ??
    product?.blank_unit_price ?? product?.unit_price ?? 0;
  const promo = product?.promotion;
  const price = promo ? promo.promo_price : Number(originalPrice);

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product, price, Number(originalPrice));
    }
  };

  const handleQuote = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRequestQuote) {
      onRequestQuote(product);
    }
  };

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group flex flex-col"
      data-testid={`product-card-${product?.id}`}
    >
      {/* ── 1. Image Area (fixed aspect) ──────────────────────── */}
      <div className="relative">
        <button
          className="w-full h-44 bg-[#f8fafc] overflow-hidden flex items-center justify-center"
          onClick={() => onDetail?.(product)}
          data-testid={`product-image-${product?.id}`}
        >
          {(product?.image_url || product?.images?.[0] || product?.hero_image || product?.primary_image) ? (
            <img
              src={resolveImageUrl(product.image_url || product.images?.[0] || product.hero_image || product.primary_image)}
              alt={product?.name || "Product"}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-300"
              onError={(e) => { e.target.style.display = "none"; e.target.nextSibling && (e.target.nextSibling.style.display = "flex"); }}
            />
          ) : null}
          <div className={`w-full h-full flex items-center justify-center ${(product?.image_url || product?.images?.[0] || product?.hero_image || product?.primary_image) ? "hidden" : ""}`}>
            <Package className="w-10 h-10 text-gray-300" />
          </div>
        </button>
        {promo && (
          <span
            className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-sm"
            data-testid={`promo-badge-${product?.id}`}
          >
            {promo.discount_label}
          </span>
        )}
      </div>

      {/* ── 2-5. Content Block (flex-col to fill remaining space) ── */}
      <div className="p-4 flex flex-col flex-1">
        {/* ── 3. Category/subtitle area ──────────────────────── */}
        <div className="mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-[#20364D]/10 text-[#20364D] inline-block">
            {product?.category || product?.category_name || product?.group_name || "General"}
          </span>
        </div>

        {/* ── 2. Title area (fixed 2-line height) ────────────── */}
        <button
          onClick={() => onDetail?.(product)}
          className="text-sm font-semibold text-[#0f172a] leading-5 line-clamp-2 text-left hover:underline min-h-[40px]"
          data-testid={`product-title-${product?.id}`}
        >
          {product?.name}
        </button>

        {/* Spacer to push price + actions to bottom */}
        <div className="flex-1" />

        {/* ── 4. Fixed-height price/promotions block ──────────── */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="h-[52px]" data-testid={`price-block-${product?.id}`}>
            {/* Line 1: Current price (always) */}
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-[#0f172a] text-base">{money(price)}</span>
              {promo && (
                <span className="text-xs text-slate-400 line-through">{money(originalPrice)}</span>
              )}
            </div>
            {/* Line 2: Savings text (promo) or reserved empty space (no promo) */}
            <div className="h-[20px] mt-0.5">
              {promo ? (
                <p className="text-[11px] text-emerald-600 font-medium truncate">
                  Save {money(promo.discount_amount)}
                </p>
              ) : null}
            </div>
          </div>

          {/* ── 5. Fixed-height action area ──────────────────── */}
          <div className="h-[72px] flex flex-col gap-1.5 mt-1" data-testid={`actions-block-${product?.id}`}>
            <button
              onClick={handleAdd}
              className="w-full rounded-lg bg-[#0f172a] text-white py-2 text-xs font-semibold hover:bg-[#1e293b] transition-colors flex items-center justify-center gap-1.5"
              data-testid={`add-to-cart-${product?.id}`}
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
            </button>
            <button
              onClick={handleQuote}
              className="w-full text-center text-xs text-slate-500 hover:text-[#20364D] font-medium py-1 transition-colors"
              data-testid={`request-quote-${product?.id}`}
            >
              Request Quote
            </button>
            {product?.related_services?.length > 0 && (
              <Link
                to={`/marketplace?tab=services`}
                className="w-full text-center text-xs text-[#D4A843] hover:text-[#c49a3d] font-semibold py-0.5 transition-colors"
                data-testid={`customize-cta-${product?.id}`}
              >
                Customize this →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
