import React, { useState, useCallback, useEffect } from "react";
import { Calculator, Tag, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";

/**
 * InstantQuoteEstimator — Customer-facing price estimation widget.
 *
 * Shows safe price estimates using the pricing engine.
 * NEVER displays internal margins, distributable pools, or allocation math.
 *
 * Props:
 *   baseCost       - Base cost per unit (number)
 *   productName    - Product/service name for display
 *   categoryId     - For scoped promo validation (optional)
 *   productId      - For scoped promo validation (optional)
 *   onRequestQuote - Callback with { quantity, estimatedTotal, promoCode }
 *   showRange      - If true, shows price range instead of exact estimate
 *   minBaseCost    - For range mode (optional)
 *   maxBaseCost    - For range mode (optional)
 *   compact        - Smaller layout variant (optional)
 */
export default function InstantQuoteEstimator({
  baseCost = 0,
  productName = "",
  categoryId,
  productId,
  onRequestQuote,
  showRange = false,
  minBaseCost,
  maxBaseCost,
  compact = false,
}) {
  const [quantity, setQuantity] = useState(1);
  const [promoCode, setPromoCode] = useState("");
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoResult, setPromoResult] = useState(null);

  // Fetch estimate when quantity changes
  const fetchEstimate = useCallback(async (qty, code) => {
    if (baseCost <= 0 && !showRange) return;
    setLoading(true);
    try {
      if (showRange && minBaseCost && maxBaseCost) {
        const res = await api.post("/api/quote-estimate/range", {
          min_base_cost: minBaseCost,
          max_base_cost: maxBaseCost,
          quantity: qty,
        });
        setEstimate({ ...res.data, type: "range" });
      } else {
        const res = await api.post("/api/quote-estimate", {
          base_cost: baseCost,
          quantity: qty,
          promo_code: code || "",
          category_id: categoryId,
          product_id: productId,
        });
        setEstimate({ ...res.data, type: "exact" });
      }
    } catch {
      setEstimate(null);
    }
    setLoading(false);
  }, [baseCost, categoryId, productId, showRange, minBaseCost, maxBaseCost]);

  useEffect(() => {
    fetchEstimate(quantity, promoCode);
  }, [quantity, fetchEstimate]);

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    await fetchEstimate(quantity, promoCode);
    setPromoLoading(false);
  };

  const clearPromo = () => {
    setPromoCode("");
    setPromoResult(null);
    fetchEstimate(quantity, "");
  };

  const money = (v) => `TZS ${Number(v || 0).toLocaleString()}`;

  const handleRequestQuote = () => {
    if (onRequestQuote) {
      onRequestQuote({
        quantity,
        estimatedTotal: estimate?.final_estimated_total || estimate?.estimated_total || 0,
        promoCode: estimate?.promotion_applied ? promoCode : "",
        productName,
      });
    }
  };

  if (baseCost <= 0 && !showRange) return null;

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white ${compact ? "p-4" : "p-5"}`} data-testid="instant-quote-estimator">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-[#20364D]/5 flex items-center justify-center">
          <Calculator className="w-4 h-4 text-[#20364D]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#20364D]">Estimated Price</h3>
          <p className="text-[10px] text-slate-400">Instant pricing guidance</p>
        </div>
      </div>

      {/* Quantity */}
      <div className="mb-4">
        <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5 block">Quantity</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors text-sm font-bold"
            data-testid="qty-decrease"
          >
            -
          </button>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 text-center rounded-lg border border-slate-200 py-1.5 text-sm font-semibold text-[#20364D] focus:ring-1 focus:ring-[#20364D] focus:border-[#20364D] outline-none"
            data-testid="qty-input"
          />
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors text-sm font-bold"
            data-testid="qty-increase"
          >
            +
          </button>
        </div>
      </div>

      {/* Estimate Display */}
      {loading ? (
        <div className="py-4 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : estimate ? (
        <div className="space-y-3">
          {estimate.type === "range" ? (
            <div className="rounded-xl bg-[#20364D]/5 p-4" data-testid="price-range-display">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Estimated Range</div>
              <div className="text-xl font-bold text-[#20364D]" data-testid="price-range-text">
                {money(estimate.price_range_low)} – {money(estimate.price_range_high)}
              </div>
              {quantity > 1 && <div className="text-xs text-slate-500 mt-1">For {quantity} units</div>}
            </div>
          ) : (
            <div className="rounded-xl bg-[#20364D]/5 p-4" data-testid="price-estimate-display">
              {quantity > 1 && (
                <div className="text-xs text-slate-500 mb-1">
                  {money(estimate.estimated_unit_price)} per unit
                </div>
              )}
              <div className="flex items-baseline gap-2">
                <div className={`font-bold text-[#20364D] ${estimate.promotion_applied ? "text-lg" : "text-xl"}`} data-testid="estimated-total">
                  {estimate.promotion_applied ? money(estimate.final_estimated_total) : money(estimate.estimated_total)}
                </div>
                {estimate.promotion_applied && (
                  <span className="text-sm text-slate-400 line-through" data-testid="original-total">
                    {money(estimate.estimated_total)}
                  </span>
                )}
              </div>
              {estimate.promotion_applied && (
                <div className="flex items-center gap-1.5 mt-2" data-testid="promo-applied-badge">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs text-emerald-700 font-medium">
                    {estimate.promo_message || `Save ${money(estimate.discount_amount)}`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Promo Code Input */}
          {estimate.type !== "range" && (
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5 block">Promo Code</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:ring-1 focus:ring-[#20364D] focus:border-[#20364D] outline-none"
                    onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                    data-testid="promo-code-input"
                  />
                </div>
                {promoCode && estimate.promotion_applied ? (
                  <button onClick={clearPromo} className="text-xs text-red-500 hover:text-red-700 px-2 font-semibold" data-testid="clear-promo-btn">
                    Clear
                  </button>
                ) : (
                  <button
                    onClick={applyPromo}
                    disabled={promoLoading || !promoCode.trim()}
                    className="px-3 py-2 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition-colors"
                    data-testid="apply-promo-btn"
                  >
                    {promoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="text-[10px] text-slate-400 italic" data-testid="price-note">
            {estimate.price_note || "Final price confirmed after review"}
          </div>
        </div>
      ) : null}

      {/* CTA */}
      <div className="mt-4 space-y-2">
        {onRequestQuote && (
          <button
            onClick={handleRequestQuote}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#D4A843] text-white py-2.5 text-sm font-semibold hover:bg-[#c49a3a] transition-colors"
            data-testid="request-quote-btn"
          >
            Request Exact Quote <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
