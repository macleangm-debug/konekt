import React, { useState } from "react";
import { FlaskConical, ArrowRight } from "lucide-react";
import { adminApi } from "@/lib/adminApi";

const fmtCurrency = (v) => `TZS ${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
const fmtPct = (v) => `${Number(v || 0).toFixed(1)}%`;

export default function QuickPriceCheckWidget() {
  const [basePrice, setBasePrice] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const resolve = async () => {
    if (!basePrice) return;
    setLoading(true);
    try {
      const res = await adminApi.quickPriceCheck({ base_price: Number(basePrice) });
      setResult(res.data);
    } catch {
      setResult(null);
    }
    setLoading(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid="quick-price-check-widget">
      <div className="border-b border-slate-200 px-5 py-3">
        <h3 className="text-sm font-bold text-[#20364D]">Quick Price Check</h3>
        <p className="text-xs text-slate-400 mt-0.5">Resolve pricing instantly during customer calls.</p>
      </div>
      <div className="p-5">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block">Base Price (TZS)</label>
            <input
              type="number"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="e.g. 25000"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
              data-testid="quick-price-input"
              onKeyDown={(e) => e.key === "Enter" && resolve()}
            />
          </div>
          <button
            onClick={resolve}
            disabled={!basePrice || loading}
            className="flex items-center gap-2 rounded-xl bg-[#20364D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2a4560] disabled:opacity-40"
            data-testid="quick-price-resolve-btn"
          >
            <FlaskConical className="h-4 w-4" /> {loading ? "..." : "Check"}
          </button>
        </div>
        {result && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4" data-testid="quick-price-result">
            <div className="text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Base</div>
              <div className="text-lg font-extrabold text-[#20364D]">{fmtCurrency(result.base_price)}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
            <div className="text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Final</div>
              <div className="text-lg font-extrabold text-emerald-700">{fmtCurrency(result.final_price)}</div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Margin</div>
              <div className="text-sm font-bold text-blue-700">
                {fmtCurrency(result.final_price - result.base_price)}
                <span className="text-xs text-slate-400 ml-1">
                  ({result.base_price ? fmtPct((result.final_price - result.base_price) / result.base_price * 100) : "0%"})
                </span>
              </div>
              <div className="text-[10px] text-slate-500 capitalize mt-0.5">
                {result.resolved_from}{result.tier?.label ? ` / ${result.tier.label}` : ""}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
