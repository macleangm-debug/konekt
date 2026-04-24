import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Sparkles, Wand2, Check, X, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const BRANCHES = [
  "All branches",
  "Promotional Materials",
  "Office Equipment",
  "Stationery",
  "Services",
];

/**
 * PromoAISuggester — wraps /api/admin/promotions/suggest + /bulk-create.
 * Admin picks desired count + branch + pool-share → sees a ranked list of
 * proposals with expected platform profit → selects which to publish.
 */
export default function PromoAISuggester({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [params, setParams] = useState({
    branch: "All branches",
    min_margin_pct: 10,
    pool_share_pct: 35,
    max_suggestions: 5,
    promo_style: "percentage",
  });
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const fmt = (v) => `TZS ${Number(v || 0).toLocaleString("en-US")}`;

  const runSuggest = async () => {
    setLoading(true);
    setSuggestions([]);
    setSelectedIds(new Set());
    try {
      const body = {
        min_margin_pct: params.min_margin_pct,
        pool_share_pct: params.pool_share_pct,
        max_suggestions: params.max_suggestions,
        promo_style: params.promo_style,
      };
      if (params.branch && params.branch !== "All branches") body.branch = params.branch;
      const { data } = await api.post("/api/admin/promotions/suggest", body);
      setSuggestions(data.suggestions || []);
      // Preselect all by default so admin can one-click publish
      setSelectedIds(new Set((data.suggestions || []).map((s) => s.product_id)));
      if ((data.suggestions || []).length === 0) {
        toast.info("No products clear the margin floor. Try a lower min-margin %.");
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to generate suggestions");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const publish = async () => {
    const picked = suggestions.filter((s) => selectedIds.has(s.product_id));
    if (picked.length === 0) {
      toast.error("Select at least one suggestion to publish");
      return;
    }
    setPublishing(true);
    try {
      const body = {
        entries: picked.map((s) => ({
          product_id: s.product_id,
          discount_pct: s.discount_pct,
          discount_amount: s.discount_amount,
          duration_days: s.suggested_duration_days,
          promo_style: s.promo_style,
          headline: s.headline,
        })),
      };
      const { data } = await api.post("/api/admin/promotions/bulk-create", body);
      toast.success(`Published ${data.created_count} promotion${data.created_count !== 1 ? "s" : ""}`);
      setSuggestions([]);
      setSelectedIds(new Set());
      setOpen(false);
      onCreated?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to publish promotions");
    } finally {
      setPublishing(false);
    }
  };

  const selectedProfit = suggestions
    .filter((s) => selectedIds.has(s.product_id))
    .reduce((sum, s) => sum + (s.expected_platform_profit || 0), 0);

  return (
    <div
      className="rounded-2xl border border-[#D4A843]/30 bg-gradient-to-br from-amber-50 via-white to-slate-50 p-5 shadow-sm"
      data-testid="promo-ai-suggester"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 w-10 h-10 rounded-xl bg-[#D4A843]/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-[#D4A843]" strokeWidth={2.2} />
          </div>
          <div>
            <h3 className="font-bold text-[#20364D]">AI Promotion Assistant</h3>
            <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
              Looks at your pricing tiers + protected margins and proposes promotions
              that preserve platform profit. Pick how many you want and it does the rest.
            </p>
          </div>
        </div>
        {!open && (
          <Button
            onClick={() => setOpen(true)}
            className="bg-[#20364D] hover:bg-[#2a4a66] text-white gap-2 shrink-0"
            data-testid="ai-suggest-open-btn"
          >
            <Wand2 className="w-4 h-4" /> Get suggestions
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-5 pt-5 border-t border-amber-200/60 space-y-4">
          {/* Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">How many?</label>
              <input
                type="number" min="1" max="20"
                value={params.max_suggestions}
                onChange={(e) => setParams((p) => ({ ...p, max_suggestions: Math.max(1, parseInt(e.target.value) || 1) }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-[#D4A843]"
                data-testid="ai-param-count"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">Branch</label>
              <select
                value={params.branch}
                onChange={(e) => setParams((p) => ({ ...p, branch: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-[#D4A843]"
                data-testid="ai-param-branch"
              >
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">Min margin %</label>
              <input
                type="number" min="0" max="100" step="1"
                value={params.min_margin_pct}
                onChange={(e) => setParams((p) => ({ ...p, min_margin_pct: parseFloat(e.target.value) || 0 }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-[#D4A843]"
                data-testid="ai-param-min-margin"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">Pool share %</label>
              <input
                type="number" min="1" max="100" step="5"
                value={params.pool_share_pct}
                onChange={(e) => setParams((p) => ({ ...p, pool_share_pct: parseFloat(e.target.value) || 0 }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-[#D4A843]"
                data-testid="ai-param-pool-share"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">Style</label>
              <select
                value={params.promo_style}
                onChange={(e) => setParams((p) => ({ ...p, promo_style: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-[#D4A843]"
                data-testid="ai-param-style"
              >
                <option value="percentage">% off</option>
                <option value="flat_off">Flat TZS off</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={runSuggest}
              disabled={loading}
              className="bg-[#D4A843] hover:bg-[#c19934] text-[#17283C] font-semibold gap-2"
              data-testid="ai-suggest-run-btn"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {loading ? "Thinking…" : "Generate suggestions"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setOpen(false); setSuggestions([]); setSelectedIds(new Set()); }}
              className="text-slate-600"
            >
              Close
            </Button>
          </div>

          {/* Suggestions list */}
          {suggestions.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 divide-y">
              {suggestions.map((s) => {
                const chosen = selectedIds.has(s.product_id);
                return (
                  <label
                    key={s.product_id}
                    className={`flex items-center gap-3 p-4 cursor-pointer transition ${
                      chosen ? "bg-amber-50/70" : "hover:bg-slate-50"
                    }`}
                    data-testid={`ai-suggestion-${s.product_id}`}
                  >
                    <input
                      type="checkbox"
                      checked={chosen}
                      onChange={() => toggle(s.product_id)}
                      className="w-5 h-5 accent-[#D4A843]"
                    />
                    {s.product_image && (
                      <img
                        src={s.product_image.startsWith("http") ? s.product_image : s.product_image}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover border border-slate-100 shrink-0"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#20364D] text-sm truncate">{s.product_name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-wider font-semibold shrink-0">
                          {s.tier_label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {s.headline} · Now {fmt(s.suggested_promo_price)} (was {fmt(s.current_customer_price)})
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] uppercase tracking-wider font-semibold text-emerald-700 flex items-center gap-1 justify-end">
                        <TrendingUp className="w-3 h-3" /> Profit
                      </div>
                      <div className="font-bold text-emerald-700 text-sm">
                        {fmt(s.expected_platform_profit)}
                      </div>
                    </div>
                  </label>
                );
              })}
              {/* Footer actions */}
              <div className="p-4 bg-slate-50/50 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-[#20364D]">{selectedIds.size}</span> selected ·
                  Expected total profit:{" "}
                  <span className="font-bold text-emerald-700">{fmt(selectedProfit)}</span>
                </div>
                <Button
                  onClick={publish}
                  disabled={publishing || selectedIds.size === 0}
                  className="bg-[#20364D] hover:bg-[#2a4a66] text-white gap-2"
                  data-testid="ai-publish-btn"
                >
                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Publish {selectedIds.size > 0 ? `${selectedIds.size} ` : ""}promotion{selectedIds.size !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
