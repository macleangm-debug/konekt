import React, { useState, useEffect, useMemo } from "react";
import api from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Tag, TrendingDown, X, Loader2, Eye, Play, StopCircle, AlertTriangle, Shield } from "lucide-react";
import { toast } from "sonner";

const POOL_LABELS = {
  promotion: { label: "Promotion budget", desc: "Always safe — the pool set aside for discounts.", danger: false },
  reserve:   { label: "Reserve", desc: "Emergency buffer. Safe to use on slow movers.", danger: false },
  affiliate: { label: "Affiliate cut", desc: "Spending this pool REMOVES products from the affiliate Content Studio for the promo window.", danger: "affiliate" },
  referral:  { label: "Referral cut", desc: "Spending this pool BLOCKS referral codes on these products for the promo window.", danger: "referral" },
  sales:     { label: "Sales commission", desc: "A floor is preserved (default 10%) for assisted-sales commissions. Set the floor in Settings Hub.", danger: false },
  platform_margin: { label: "Platform (Konekt) margin", desc: "LAST RESORT — eats into Konekt's own margin. Disabled by default; enable in Settings Hub.", danger: "platform" },
};

export default function AdminBulkDiscountsPage() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taxonomy, setTaxonomy] = useState({ groups: [], categories: [], subcategories: [] });
  const [defaults, setDefaults] = useState({ sales_preserve_floor_pct: 10, allow_eat_platform_margin: false, default_pools: ["promotion", "reserve"] });
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [scopeCategoryId, setScopeCategoryId] = useState("");
  const [scopeSubcategoryId, setScopeSubcategoryId] = useState("");
  const [pools, setPools] = useState(["promotion", "reserve"]);
  const [poolDrawdownPct, setPoolDrawdownPct] = useState(100);
  const [platformEatPct, setPlatformEatPct] = useState(0);
  const [discountTzs, setDiscountTzs] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [rounding, setRounding] = useState("nearest_100");
  const [previewData, setPreviewData] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [p, t, d] = await Promise.all([
        api.get("/api/admin/promotions"),
        api.get("/api/marketplace/taxonomy"),
        api.get("/api/admin/promotions/defaults"),
      ]);
      setPromos(p.data.promotions || []);
      setTaxonomy(t.data || { groups: [], categories: [], subcategories: [] });
      setDefaults(d.data || defaults);
      setPools(d.data?.default_pools || ["promotion", "reserve"]);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to load");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const visibleSubcats = useMemo(
    () => (taxonomy.subcategories || []).filter((s) => !scopeCategoryId || s.category_id === scopeCategoryId),
    [taxonomy.subcategories, scopeCategoryId]
  );

  const togglePool = (key) => {
    setPreviewData(null);
    setPools((prev) => prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]);
  };

  const resetForm = () => {
    setName(""); setScopeCategoryId(""); setScopeSubcategoryId("");
    setPools(defaults.default_pools || ["promotion", "reserve"]);
    setPoolDrawdownPct(100); setPlatformEatPct(0);
    setDiscountTzs(""); setStartDate(new Date().toISOString().slice(0, 10)); setEndDate("");
    setRounding("nearest_100"); setPreviewData(null);
  };

  const buildPayload = () => ({
    scope: { category_id: scopeCategoryId, subcategory_id: scopeSubcategoryId },
    pools,
    pool_drawdown_pct: Number(poolDrawdownPct) || 0,
    platform_eat_pct: Number(platformEatPct) || 0,
    discount_tzs: Number(discountTzs) || 0,
  });

  const runPreview = async () => {
    if (!pools.length) { toast.error("Pick at least one pool to draw from."); return; }
    setPreviewing(true);
    try {
      const r = await api.post("/api/admin/promotions/preview", buildPayload());
      setPreviewData(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  const createPromo = async () => {
    if (!name.trim()) { toast.error("Give the promo a name"); return; }
    if (!previewData) { toast.error("Run preview first"); return; }
    if (!scopeCategoryId && !scopeSubcategoryId) {
      if (!window.confirm("No scope chosen — this will discount ALL active products. Continue?")) return;
    }
    setSaving(true);
    try {
      const r = await api.post("/api/admin/promotions", {
        ...buildPayload(),
        name,
        start_date: startDate,
        end_date: endDate || "",
        rounding,
      });
      toast.success(`Promo live — applied to ${r.data.applied_count} products`);
      resetForm(); setShowForm(false); await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to create promo");
    } finally {
      setSaving(false);
    }
  };

  const endPromo = async (id) => {
    if (!window.confirm("End this promo and restore original prices?")) return;
    try {
      const r = await api.post(`/api/admin/promotions/${id}/end`);
      toast.success(`Ended — ${r.data.reverted} products restored`);
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  const blocks = previewData?.blocks || {};

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6" data-testid="admin-bulk-discounts-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Tag className="w-6 h-6" /> Smart Promotions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Margin-aware discounts wired to Settings Hub pricing tiers. Choose which pools to draw from; engine guards the rest.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} data-testid="new-promo-btn">+ New promotion</Button>
      </div>

      {/* Promos table */}
      <div className="bg-white rounded-2xl border p-4">
        <h2 className="font-bold mb-3">All promotions</h2>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground"><Loader2 className="w-5 h-5 inline mr-2 animate-spin" /> Loading…</div>
        ) : promos.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No promotions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Scope</th>
                  <th className="text-left p-2">Pools</th>
                  <th className="text-right p-2">Products</th>
                  <th className="text-left p-2">Channels blocked</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-right p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((p) => {
                  const s = p.scope || {};
                  const cat = (taxonomy.categories || []).find((c) => c.id === s.category_id);
                  const sub = (taxonomy.subcategories || []).find((ss) => ss.id === s.subcategory_id);
                  const scopeLabel = sub?.name || cat?.name || s.partner_id || s.branch || "All";
                  const bb = p.blocks || {};
                  return (
                    <tr key={p.id} className="border-t hover:bg-slate-50" data-testid={`promo-row-${p.id}`}>
                      <td className="p-2 font-medium">{p.name}</td>
                      <td className="p-2 text-xs text-muted-foreground">{scopeLabel}</td>
                      <td className="p-2 text-xs">{(p.pools || []).join(" · ")}</td>
                      <td className="p-2 text-right">{(p.product_ids || []).length}</td>
                      <td className="p-2 text-xs">
                        {bb.affiliate && <Badge variant="outline" className="mr-1 text-amber-700">Affiliate</Badge>}
                        {bb.referral && <Badge variant="outline" className="text-amber-700">Referral</Badge>}
                        {!bb.affiliate && !bb.referral && <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="p-2"><Badge variant={p.status === "active" ? "default" : "outline"}>{p.status}</Badge></td>
                      <td className="p-2 text-right">
                        {p.status === "active" && (
                          <Button variant="outline" size="sm" onClick={() => endPromo(p.id)} data-testid={`end-promo-${p.id}`}>
                            <StopCircle className="w-3.5 h-3.5 mr-1" /> End
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Create smart promotion</h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
            </div>

            {/* Basic fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Promo name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Easter flat TZS 10k off" data-testid="promo-name" />
              </div>
              <div>
                <Label>Fixed TZS discount per item (optional — leave 0 for max auto-pull)</Label>
                <Input type="number" min="0" value={discountTzs} onChange={(e) => { setDiscountTzs(e.target.value); setPreviewData(null); }} placeholder="10000" data-testid="promo-discount" />
              </div>
              <div>
                <Label>Category</Label>
                <select value={scopeCategoryId} onChange={(e) => { setScopeCategoryId(e.target.value); setScopeSubcategoryId(""); setPreviewData(null); }} className="w-full border rounded-xl px-3 py-2 text-sm bg-white" data-testid="promo-category">
                  <option value="">All categories</option>
                  {(taxonomy.categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Subcategory (optional)</Label>
                <select value={scopeSubcategoryId} onChange={(e) => { setScopeSubcategoryId(e.target.value); setPreviewData(null); }} className="w-full border rounded-xl px-3 py-2 text-sm bg-white" disabled={!scopeCategoryId} data-testid="promo-subcategory">
                  <option value="">All subcategories</option>
                  {visibleSubcats.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Start date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} data-testid="promo-start" />
              </div>
              <div>
                <Label>End date (optional — auto-expires)</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} data-testid="promo-end" />
              </div>
            </div>

            {/* Pool picker */}
            <div className="rounded-xl border p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">Which margin pools fund this promotion?</h3>
                <span className="text-xs text-muted-foreground">Sales floor: {defaults.sales_preserve_floor_pct}% · Platform eat: {defaults.allow_eat_platform_margin ? "enabled" : "disabled"}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(POOL_LABELS).map(([key, cfg]) => {
                  const disabled = key === "platform_margin" && !defaults.allow_eat_platform_margin;
                  return (
                    <label key={key} className={`flex items-start gap-2 p-2 border rounded-lg ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        checked={pools.includes(key)}
                        onChange={() => !disabled && togglePool(key)}
                        disabled={disabled}
                        className="mt-0.5"
                        data-testid={`promo-pool-${key}`}
                      />
                      <div>
                        <div className={`font-semibold text-sm flex items-center gap-1.5 ${cfg.danger === 'platform' ? 'text-red-600' : cfg.danger ? 'text-amber-700' : ''}`}>
                          {cfg.danger === 'platform' && <AlertTriangle className="w-3.5 h-3.5" />}
                          {cfg.danger === 'affiliate' && <Shield className="w-3.5 h-3.5" />}
                          {cfg.danger === 'referral' && <Shield className="w-3.5 h-3.5" />}
                          {cfg.label}
                        </div>
                        <div className="text-[11px] text-muted-foreground leading-snug">{cfg.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <Label>Pull from pools (% of what's available)</Label>
                  <Input type="number" min="0" max="100" value={poolDrawdownPct} onChange={(e) => { setPoolDrawdownPct(e.target.value); setPreviewData(null); }} data-testid="promo-drawdown" />
                </div>
                {pools.includes("platform_margin") && (
                  <div>
                    <Label className="text-red-600">% of platform margin to eat</Label>
                    <Input type="number" min="0" max="100" value={platformEatPct} onChange={(e) => { setPlatformEatPct(e.target.value); setPreviewData(null); }} data-testid="promo-platform-eat" />
                  </div>
                )}
                <div>
                  <Label>Price rounding</Label>
                  <select value={rounding} onChange={(e) => setRounding(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm bg-white">
                    <option value="nearest_100">Round to nearest TZS 100</option>
                    <option value="nearest_500">Round to nearest TZS 500</option>
                    <option value="none">No rounding</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={runPreview} disabled={previewing} data-testid="promo-preview-btn">
                {previewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                Preview impact
              </Button>
              <Button onClick={createPromo} disabled={saving || !previewData} className="bg-red-600 hover:bg-red-700" data-testid="promo-create-btn">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Activate promotion
              </Button>
            </div>

            {previewData && (
              <div className="bg-slate-50 rounded-xl p-4 border" data-testid="promo-preview-panel">
                <h3 className="font-bold mb-3 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-600" /> Impact preview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Products matched</div>
                    <div className="text-xl font-extrabold">{previewData.products_matched}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Avg margin before → after</div>
                    <div className="text-lg font-extrabold">
                      <span className="text-green-700">{previewData.current_avg_margin_pct}%</span>
                      {" → "}
                      <span className={previewData.new_avg_margin_pct < 0 ? 'text-red-600' : 'text-amber-600'}>{previewData.new_avg_margin_pct}%</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total discount (per unit sum)</div>
                    <div className="text-xl font-extrabold text-red-600">TZS {Number(previewData.total_discount_per_unit_sum).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Margin lost (per unit sum)</div>
                    <div className="text-xl font-extrabold text-red-600">TZS {Number(previewData.margin_lost_per_unit_sum).toLocaleString()}</div>
                  </div>
                </div>

                {/* Channel block warnings */}
                {(blocks.affiliate || blocks.referral) && (
                  <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs">
                    <Shield className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-amber-800">Channels that will be blocked during this promo:</div>
                      <ul className="mt-1 space-y-0.5 text-amber-700">
                        {blocks.affiliate && <li>• Affiliate Content Studio won't show these products</li>}
                        {blocks.referral && <li>• Referral codes cannot be applied on these products at checkout</li>}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Skip warnings */}
                {previewData.products_skipped_fixed_amount > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    {previewData.products_skipped_fixed_amount} products will be skipped — the allowed pools can't cover TZS {Number(discountTzs).toLocaleString()} per unit. Lower the discount or enable more pools.
                  </div>
                )}
                {previewData.products_below_cost_after_promo > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-red-600 font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    {previewData.products_below_cost_after_promo} products would sell below vendor cost after this promo.
                  </div>
                )}

                {previewData.samples?.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs text-muted-foreground mb-1">Sample of products affected (with tier + pool breakdown):</div>
                    <div className="space-y-2">
                      {previewData.samples.map((s, i) => (
                        <div key={i} className="text-xs bg-white rounded p-2 border">
                          <div className="flex items-center gap-3">
                            <span className="flex-1 font-semibold truncate">{s.name}</span>
                            <span className="text-muted-foreground">{s.tier}</span>
                            <span className="line-through text-muted-foreground">TZS {Number(s.current_price).toLocaleString()}</span>
                            <span className="font-semibold text-red-600">→ TZS {Number(s.new_price).toLocaleString()}</span>
                          </div>
                          {Object.keys(s.breakdown || {}).length > 0 && (
                            <div className="mt-1 text-[10px] text-muted-foreground">
                              Draws from: {Object.entries(s.breakdown).map(([k, v]) => `${k}:${Math.round(v).toLocaleString()}`).join(" · ")} · max give/unit TZS {Math.round(s.max_giveaway).toLocaleString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
