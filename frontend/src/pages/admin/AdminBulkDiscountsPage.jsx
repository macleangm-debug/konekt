import React, { useState, useEffect, useMemo } from "react";
import api from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Tag, TrendingDown, X, Loader2, Eye, Play, StopCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function AdminBulkDiscountsPage() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taxonomy, setTaxonomy] = useState({ groups: [], categories: [], subcategories: [] });
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [scopeCategoryId, setScopeCategoryId] = useState("");
  const [scopeSubcategoryId, setScopeSubcategoryId] = useState("");
  const [discountTzs, setDiscountTzs] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [rounding, setRounding] = useState("nearest_100");
  const [clampFloor, setClampFloor] = useState("15");
  const [previewData, setPreviewData] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [p, t] = await Promise.all([
        api.get("/api/admin/promotions"),
        api.get("/api/marketplace/taxonomy"),
      ]);
      setPromos(p.data.promotions || []);
      setTaxonomy(t.data || { groups: [], categories: [], subcategories: [] });
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

  const resetForm = () => {
    setName(""); setScopeCategoryId(""); setScopeSubcategoryId(""); setDiscountTzs("");
    setStartDate(new Date().toISOString().slice(0, 10)); setEndDate("");
    setRounding("nearest_100"); setClampFloor("15"); setPreviewData(null);
  };

  const runPreview = async () => {
    const d = Number(discountTzs);
    if (!(d > 0)) { toast.error("Enter a discount amount in TZS"); return; }
    setPreviewing(true);
    try {
      const r = await api.post("/api/admin/promotions/preview", {
        scope: { category_id: scopeCategoryId, subcategory_id: scopeSubcategoryId },
        discount_tzs: d,
      });
      setPreviewData(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  const createPromo = async () => {
    if (!name.trim()) { toast.error("Give the promo a name"); return; }
    const d = Number(discountTzs);
    if (!(d > 0)) { toast.error("Enter a positive TZS discount"); return; }
    if (!scopeCategoryId && !scopeSubcategoryId) {
      if (!window.confirm("No scope chosen — this will discount ALL active products. Continue?")) return;
    }
    setSaving(true);
    try {
      const r = await api.post("/api/admin/promotions", {
        name,
        scope: { category_id: scopeCategoryId, subcategory_id: scopeSubcategoryId },
        discount_tzs: d,
        start_date: startDate,
        end_date: endDate || "",
        rounding,
        clamp_floor_margin_pct: Number(clampFloor) || 0,
      });
      toast.success(`Promo live — applied to ${r.data.applied_count} products`);
      resetForm();
      setShowForm(false);
      await load();
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
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to end promo");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6" data-testid="admin-bulk-discounts-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="w-6 h-6" /> Bulk Price Discounts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Apply a flat TZS discount across any slice of the catalog (category / subcategory). Live margin preview before you commit.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} data-testid="new-promo-btn">+ New bulk discount</Button>
      </div>

      <div className="bg-white rounded-2xl border p-4">
        <h2 className="font-bold mb-3">All bulk discounts</h2>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground"><Loader2 className="w-5 h-5 inline mr-2 animate-spin" /> Loading…</div>
        ) : promos.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No promotions yet — click "New bulk discount".</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Scope</th>
                  <th className="text-right p-2">Save / item</th>
                  <th className="text-right p-2">Products</th>
                  <th className="text-left p-2">Runs</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-right p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((p) => {
                  const scope = p.scope || {};
                  const cat = (taxonomy.categories || []).find((c) => c.id === scope.category_id);
                  const sub = (taxonomy.subcategories || []).find((s) => s.id === scope.subcategory_id);
                  const scopeLabel = sub?.name || cat?.name || scope.partner_id || scope.branch || "All products";
                  return (
                    <tr key={p.id} className="border-t hover:bg-slate-50" data-testid={`promo-row-${p.id}`}>
                      <td className="p-2 font-medium">{p.name}</td>
                      <td className="p-2 text-xs text-muted-foreground">{scopeLabel}</td>
                      <td className="p-2 text-right font-mono">TZS {Number(p.discount_tzs).toLocaleString()}</td>
                      <td className="p-2 text-right">{(p.product_ids || []).length}</td>
                      <td className="p-2 text-xs">{p.start_date}{p.end_date ? ` → ${p.end_date}` : " • no end"}</td>
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

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Create bulk discount</h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Promo name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Easter weekend flat 10k off" data-testid="promo-name" />
              </div>
              <div>
                <Label>TZS discount per item</Label>
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
                  <option value="">All subcategories in the category</option>
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
              <div>
                <Label>Price rounding</Label>
                <select value={rounding} onChange={(e) => setRounding(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm bg-white">
                  <option value="nearest_100">Round to nearest TZS 100</option>
                  <option value="nearest_500">Round to nearest TZS 500</option>
                  <option value="none">No rounding</option>
                </select>
              </div>
              <div>
                <Label>Minimum margin floor (%)</Label>
                <Input type="number" min="0" max="80" value={clampFloor} onChange={(e) => setClampFloor(e.target.value)} placeholder="15" data-testid="promo-clamp" />
                <p className="text-[11px] text-muted-foreground mt-1">Skip products where post-promo margin would fall below this %. Set 0 to ignore.</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={runPreview} disabled={previewing || !discountTzs} data-testid="promo-preview-btn">
                {previewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                Preview impact
              </Button>
              <Button onClick={createPromo} disabled={saving || !previewData} className="bg-red-600 hover:bg-red-700" data-testid="promo-create-btn">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Activate bulk discount
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
                    <div className="text-xs text-muted-foreground">Current avg margin</div>
                    <div className="text-xl font-extrabold text-green-700">{previewData.current_avg_margin_pct}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">New avg margin</div>
                    <div className={`text-xl font-extrabold ${previewData.new_avg_margin_pct >= (Number(clampFloor) || 0) ? 'text-green-700' : 'text-red-600'}`}>
                      {previewData.new_avg_margin_pct}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Margin lost per unit-set</div>
                    <div className="text-xl font-extrabold text-red-600">TZS {Number(previewData.margin_lost_per_unit_sum).toLocaleString()}</div>
                  </div>
                </div>
                {previewData.products_below_cost_after_promo > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-red-600 font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    {previewData.products_below_cost_after_promo} products would sell at or below cost — margin floor will skip them if set.
                  </div>
                )}
                {previewData.samples?.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs text-muted-foreground mb-1">Sample of products affected:</div>
                    <div className="space-y-1">
                      {previewData.samples.map((s, i) => (
                        <div key={i} className="text-xs flex items-center gap-3 text-slate-700">
                          <span className="flex-1 truncate">{s.name}</span>
                          <span className="line-through text-muted-foreground">TZS {Number(s.current_price).toLocaleString()}</span>
                          <span className="font-semibold text-red-600">→ TZS {Number(s.new_price).toLocaleString()}</span>
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
