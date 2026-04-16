import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Plus, Clock, Check, X, Users, Package, RefreshCw, Star, Search } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

// ─── Number formatting ───
const fmtNum = (v) => Number(v || 0).toLocaleString("en-US");
const fmt = (v) => `TZS ${fmtNum(v)}`;

// Format input on blur, strip on focus
function CurrencyInput({ value, onChange, ...props }) {
  const [display, setDisplay] = useState(value || "");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      const n = Number(String(value).replace(/,/g, "") || 0);
      setDisplay(n > 0 ? fmtNum(n) : "");
    }
  }, [value, focused]);

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      value={focused ? value : display}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const raw = e.target.value.replace(/,/g, "");
        if (raw === "" || /^\d*\.?\d*$/.test(raw)) onChange(raw);
      }}
    />
  );
}

const statusConfig = {
  active: { color: "bg-blue-100 text-blue-700", label: "Active" },
  finalized: { color: "bg-emerald-100 text-emerald-700", label: "Finalized" },
  failed: { color: "bg-red-100 text-red-700", label: "Failed" },
};

function ProfitCalculator({ basePrice, vendorCost, dealPrice, target }) {
  const bp = Number(basePrice || 0);
  const vc = Number(vendorCost || 0);
  const dp = Number(dealPrice || 0);
  const t = Number(target || 0);
  const margin = dp - vc;
  const marginPct = dp > 0 ? ((margin / dp) * 100).toFixed(1) : 0;
  const totalMargin = margin * t;
  const discountPct = bp > 0 ? (((bp - dp) / bp) * 100).toFixed(0) : 0;
  const safe = margin > 0 && marginPct >= 5;

  return (
    <div className={`rounded-xl border p-4 space-y-2 ${safe ? "bg-green-50 border-green-200" : margin <= 0 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`} data-testid="profit-calculator">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Live Profit Calculator</div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-slate-500">Base Price:</span> <span className="font-bold">{fmt(bp)}</span></div>
        <div><span className="text-slate-500">Vendor Cost:</span> <span className="font-bold">{fmt(vc)}</span></div>
        <div><span className="text-slate-500">Deal Price:</span> <span className="font-bold">{fmt(dp)}</span></div>
        <div><span className="text-slate-500">Margin/Unit:</span> <span className="font-bold">{fmt(margin)}</span></div>
        <div><span className="text-slate-500">Margin %:</span> <span className="font-bold">{marginPct}%</span></div>
        <div><span className="text-slate-500">Discount:</span> <span className="font-bold">{fmt(bp - dp)} off ({discountPct}%)</span></div>
      </div>
      <div className="pt-2 border-t flex justify-between items-center">
        <span className="text-sm font-bold">Total Margin ({fmtNum(t)} units):</span>
        <span className="text-lg font-extrabold">{fmt(totalMargin)}</span>
      </div>
      <div className={`text-xs font-bold ${safe ? "text-green-700" : margin <= 0 ? "text-red-700" : "text-amber-700"}`}>
        {margin <= 0 ? "BLOCKED — Deal price at or below vendor cost" : marginPct < 5 ? "WARNING — Margin below 5% threshold" : "SAFE — Campaign is profitable"}
      </div>
    </div>
  );
}

function ProductSelector({ onSelect, selected }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const search = useCallback(async (q) => {
    setSearching(true);
    try {
      const r = await api.get(`/api/admin/group-deals/products/search?q=${encodeURIComponent(q)}`);
      setResults(r.data || []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, []);

  useEffect(() => { search(""); }, [search]);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  if (selected) {
    return (
      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border" data-testid="selected-product">
        {selected.image && <img src={selected.image} alt="" className="w-12 h-12 rounded-lg object-cover" />}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-[#20364D] truncate">{selected.name}</div>
          <div className="text-xs text-slate-500">{selected.category} {selected.base_price > 0 ? `\u2022 Base: ${fmt(selected.base_price)}` : ""}</div>
        </div>
        <button onClick={() => onSelect(null)} className="text-xs text-red-500 hover:text-red-700 font-semibold" data-testid="change-product-btn">Change</button>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="product-selector">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input className="pl-9" placeholder="Search products..." value={query} onChange={(e) => setQuery(e.target.value)} data-testid="product-search-input" />
      </div>
      <div className="max-h-48 overflow-y-auto border rounded-xl divide-y">
        {searching ? <div className="p-3 text-xs text-slate-400 text-center">Searching...</div> :
          results.length === 0 ? <div className="p-3 text-xs text-slate-400 text-center">No products found</div> :
          results.map((p) => (
            <button key={p.id} onClick={() => onSelect(p)}
              className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 text-left transition" data-testid={`product-option-${p.id}`}>
              {p.image && <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
              {!p.image && <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#20364D] truncate">{p.name}</div>
                <div className="text-xs text-slate-500 truncate">{p.category} {p.base_price > 0 ? `\u2022 ${fmt(p.base_price)}` : ""}</div>
              </div>
            </button>
          ))
        }
      </div>
    </div>
  );
}

export default function GroupDealsAdminPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form, setForm] = useState({
    vendor_cost: "", original_price: "", discounted_price: "",
    display_target: "50", vendor_threshold: "30", duration_days: "14",
    commission_mode: "none", affiliate_share_pct: "0", description: "",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadCampaigns(); loadPendingPayments(); }, []);

  const loadCampaigns = async () => {
    try {
      const r = await api.get("/api/admin/group-deals/campaigns");
      setCampaigns(r.data || []);
    } catch { toast.error("Failed to load campaigns"); }
    finally { setLoading(false); }
  };

  const loadPendingPayments = async () => {
    try {
      const r = await api.get("/api/admin/group-deals/commitments/pending-payments");
      setPendingPayments(r.data || []);
    } catch { /* silent */ }
  };

  const approvePayment = async (ref) => {
    try {
      await api.post(`/api/admin/group-deals/commitments/${ref}/approve-payment`);
      toast.success("Payment approved");
      loadPendingPayments();
      loadCampaigns();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to approve"); }
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    if (product) {
      setForm(p => ({
        ...p,
        original_price: String(product.base_price || ""),
        description: product.description || "",
      }));
    }
  };

  const createCampaign = async (e) => {
    e.preventDefault();
    if (!selectedProduct) { toast.error("Please select a product"); return; }
    setCreating(true);
    try {
      const payload = {
        product_name: selectedProduct.name,
        product_id: selectedProduct.id,
        product_image: selectedProduct.image || "",
        category: selectedProduct.category || "",
        description: form.description,
        vendor_cost: form.vendor_cost,
        original_price: form.original_price || String(Number(form.discounted_price) * 1.25),
        discounted_price: form.discounted_price,
        display_target: form.display_target,
        vendor_threshold: form.vendor_threshold,
        duration_days: form.duration_days,
        commission_mode: form.commission_mode,
        affiliate_share_pct: form.affiliate_share_pct,
      };
      await api.post("/api/admin/group-deals/campaigns", payload);
      toast.success("Campaign created");
      setShowCreate(false);
      setSelectedProduct(null);
      setForm({ vendor_cost: "", original_price: "", discounted_price: "", display_target: "50", vendor_threshold: "30", duration_days: "14", commission_mode: "none", affiliate_share_pct: "0", description: "" });
      loadCampaigns();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to create campaign"); }
    finally { setCreating(false); }
  };

  const finalizeCampaign = async (id) => {
    try {
      const r = await api.post(`/api/admin/group-deals/campaigns/${id}/finalize`);
      toast.success(`${r.data.orders_created} orders + vendor back order created`);
      loadCampaigns();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to finalize"); }
  };

  const cancelCampaign = async (id) => {
    try {
      await api.post(`/api/admin/group-deals/campaigns/${id}/cancel`);
      toast.success("Campaign cancelled — refunds pending");
      loadCampaigns();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to cancel"); }
  };

  const processRefunds = async (id) => {
    try {
      const r = await api.post(`/api/admin/group-deals/campaigns/${id}/process-refunds`);
      toast.success(`${r.data.refunded_count} refunds processed`);
      loadCampaigns();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to process refunds"); }
  };

  const toggleFeatured = async (id, currentlyFeatured) => {
    try {
      if (currentlyFeatured) {
        await api.post(`/api/admin/group-deals/campaigns/${id}/unset-featured`);
        toast.success("Removed from Deal of the Day");
      } else {
        await api.post(`/api/admin/group-deals/campaigns/${id}/set-featured`);
        toast.success("Set as Deal of the Day");
      }
      loadCampaigns();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to update featured status"); }
  };

  const stats = useMemo(() => ({
    active: campaigns.filter(c => c.status === "active").length,
    threshold_ready: campaigns.filter(c => c.status === "active" && c.threshold_met).length,
    finalized: campaigns.filter(c => c.status === "finalized").length,
    total_committed: campaigns.reduce((s, c) => s + (c.current_committed || 0), 0),
  }), [campaigns]);

  return (
    <div className="p-6 space-y-5" data-testid="group-deals-admin">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#20364D]">Group Deal Campaigns</h1>
          <p className="text-sm text-slate-500">Demand aggregation — commitments first, orders on finalize</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-[#20364D]" data-testid="create-campaign-btn">
          <Plus className="w-4 h-4 mr-2" /> New Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border p-4"><div className="text-2xl font-extrabold text-blue-600">{stats.active}</div><div className="text-xs text-slate-500">Active</div></div>
        <div className="bg-white rounded-xl border p-4"><div className="text-2xl font-extrabold text-amber-600">{stats.threshold_ready}</div><div className="text-xs text-slate-500">Ready to Finalize</div></div>
        <div className="bg-white rounded-xl border p-4"><div className="text-2xl font-extrabold text-emerald-600">{stats.finalized}</div><div className="text-xs text-slate-500">Finalized</div></div>
        <div className="bg-white rounded-xl border p-4"><div className="text-2xl font-extrabold text-[#20364D]">{fmtNum(stats.total_committed)}</div><div className="text-xs text-slate-500">Total Units</div></div>
      </div>

      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5" data-testid="pending-payments-section">
          <div className="text-sm font-bold text-amber-800 mb-3">Payments Awaiting Approval ({pendingPayments.length})</div>
          <div className="space-y-2">
            {pendingPayments.map((p) => (
              <div key={p.commitment_ref} className="flex items-center justify-between bg-white rounded-xl border p-3" data-testid={`pending-${p.commitment_ref}`}>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#20364D]">{p.customer_name} <span className="text-xs text-slate-400">{p.customer_phone}</span></div>
                  <div className="text-xs text-slate-500">{p.campaign_name} &middot; {p.quantity} units &middot; {fmt(p.amount)}</div>
                  {p.payment_proof?.bank_reference && <div className="text-xs text-slate-400 font-mono">Ref: {p.payment_proof.bank_reference}</div>}
                </div>
                <Button size="sm" onClick={() => approvePayment(p.commitment_ref)} className="bg-green-600 hover:bg-green-700 flex-shrink-0" data-testid={`approve-${p.commitment_ref}`}>
                  <Check className="w-3 h-3 mr-1" /> Approve
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaign List */}
      <div className="space-y-3">
        {loading ? <div className="text-slate-500 p-8 text-center">Loading...</div> :
          campaigns.length === 0 ? <div className="text-slate-400 p-8 text-center bg-white rounded-xl border">No campaigns yet.</div> :
          campaigns.map((c) => {
            const sc = statusConfig[c.status] || statusConfig.active;
            const progress = c.display_target > 0 ? Math.round((c.current_committed / c.display_target) * 100) : 0;
            const daysLeft = c.deadline ? Math.max(0, Math.ceil((new Date(c.deadline) - new Date()) / 86400000)) : 0;
            const thresholdReady = c.status === "active" && c.threshold_met;

            return (
              <div key={c.id} className={`bg-white rounded-2xl border p-5 ${thresholdReady ? "ring-2 ring-amber-400" : ""}`} data-testid={`campaign-${c.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base font-bold text-[#20364D] truncate">{c.product_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{c.campaign_id} {c.description ? `\u2022 ${c.description.slice(0, 60)}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={sc.color}>{sc.label}</Badge>
                    {thresholdReady && <Badge className="bg-amber-100 text-amber-700 animate-pulse">Threshold Met</Badge>}
                    {c.is_featured && <Badge className="bg-yellow-100 text-yellow-700">Featured</Badge>}
                    {c.status === "active" && <span className="text-xs text-slate-400">{daysLeft}d left</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
                  <div><span className="text-slate-400 text-xs">Price</span><div className="font-bold text-[#D4A843]">{fmt(c.discounted_price)} <span className="text-xs text-slate-400 line-through ml-1">{fmt(c.original_price)}</span></div></div>
                  <div><span className="text-slate-400 text-xs">Margin</span><div className="font-bold">{fmt(c.margin_per_unit)} <span className="text-xs text-slate-400">({c.margin_pct}%)</span></div></div>
                  <div><span className="text-slate-400 text-xs">Units / Buyers</span><div className="font-bold">{fmtNum(c.current_committed)}/{fmtNum(c.display_target)} <span className="text-xs text-slate-400">({c.buyer_count || 0} buyers)</span></div></div>
                  <div><span className="text-slate-400 text-xs">Revenue</span><div className="font-bold">{fmt(c.current_committed * c.discounted_price)}</div></div>
                </div>

                <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-green-500" : progress >= 60 ? "bg-blue-500" : "bg-amber-400"}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>

                {c.status === "finalized" && c.vbo_number && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg">
                    <Package className="w-3.5 h-3.5" />
                    <span>VBO: <span className="font-bold">{c.vbo_number}</span> — {c.orders_created} orders, {fmtNum(c.total_units_ordered)} units</span>
                  </div>
                )}

                <div className="flex gap-2 mt-3 flex-wrap">
                  {thresholdReady && (
                    <Button size="sm" onClick={() => finalizeCampaign(c.id)} className="bg-green-600 hover:bg-green-700" data-testid={`finalize-${c.id}`}>
                      <Check className="w-3 h-3 mr-1" /> Finalize Orders
                    </Button>
                  )}
                  {c.status === "active" && (
                    <Button size="sm" variant="outline" onClick={() => toggleFeatured(c.id, c.is_featured)}
                      className={c.is_featured ? "text-amber-600 border-amber-300 bg-amber-50" : "text-slate-600"} data-testid={`featured-${c.id}`}>
                      <Star className={`w-3 h-3 mr-1 ${c.is_featured ? "fill-amber-500" : ""}`} /> {c.is_featured ? "Featured" : "Set Featured"}
                    </Button>
                  )}
                  {c.status === "active" && (
                    <Button size="sm" variant="outline" onClick={() => cancelCampaign(c.id)} className="text-red-600 border-red-200" data-testid={`cancel-${c.id}`}>
                      <X className="w-3 h-3 mr-1" /> Cancel
                    </Button>
                  )}
                  {c.status === "failed" && (
                    <Button size="sm" onClick={() => processRefunds(c.id)} className="bg-orange-600 hover:bg-orange-700" data-testid={`refund-${c.id}`}>
                      <RefreshCw className="w-3 h-3 mr-1" /> Process Refunds
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        }
      </div>

      {/* Create Campaign — Step-Based Wizard */}
      <Dialog open={showCreate} onOpenChange={(v) => { setShowCreate(v); if (!v) { setSelectedProduct(null); setWizardStep(1); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Group Deal</DialogTitle>
            <DialogDescription>Step {wizardStep} of 5 — {["Select Product", "Deal Pricing", "Target & Duration", "Promotion Settings", "Review & Publish"][wizardStep - 1]}</DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-1 mb-2" data-testid="wizard-steps">
            {[1,2,3,4,5].map((s) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition ${s <= wizardStep ? "bg-[#D4A843]" : "bg-slate-200"}`} />
            ))}
          </div>

          <form onSubmit={createCampaign} className="space-y-4 pt-2" data-testid="create-campaign-form">
            {/* Step 1: Product Selection */}
            {wizardStep === 1 && (
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">Select Product from Catalog</Label>
                <ProductSelector selected={selectedProduct} onSelect={handleProductSelect} />
                {selectedProduct && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border text-xs text-slate-600">
                    <div><strong>Category:</strong> {selectedProduct.category}</div>
                    <div><strong>Unit:</strong> {selectedProduct.unit_of_measurement || "Piece"}</div>
                    {selectedProduct.base_price > 0 && <div><strong>Vendor Cost:</strong> {fmt(selectedProduct.base_price)}</div>}
                    {selectedProduct.selling_price > 0 && <div><strong>Current Sell Price:</strong> {fmt(selectedProduct.selling_price)}</div>}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Deal Pricing */}
            {wizardStep === 2 && selectedProduct && (
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">Deal Pricing</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Base Price (from product)</Label>
                    <div className="px-3 py-2.5 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-600" data-testid="base-price-display">{fmt(form.original_price || 0)}</div>
                  </div>
                  <div>
                    <Label className="text-xs">Vendor Best Price *</Label>
                    <CurrencyInput value={form.vendor_cost} onChange={(v) => setForm(p => ({ ...p, vendor_cost: v }))} required data-testid="input-vendor-cost" placeholder="e.g. 800,000" />
                  </div>
                  <div>
                    <Label className="text-xs">Group Deal Price *</Label>
                    <CurrencyInput value={form.discounted_price} onChange={(v) => setForm(p => ({ ...p, discounted_price: v }))} required data-testid="input-deal-price" placeholder="e.g. 960,000" />
                  </div>
                </div>
                <ProfitCalculator basePrice={form.original_price} vendorCost={form.vendor_cost} dealPrice={form.discounted_price} target={form.display_target || 10} />
              </div>
            )}

            {/* Step 3: Target & Duration */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">Target & Duration</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-xs">Display Target (units) *</Label><Input type="number" value={form.display_target} onChange={(e) => setForm(p => ({ ...p, display_target: e.target.value }))} required data-testid="input-display-target" /></div>
                  <div><Label className="text-xs">Vendor Threshold</Label><Input type="number" value={form.vendor_threshold} onChange={(e) => setForm(p => ({ ...p, vendor_threshold: e.target.value }))} data-testid="input-vendor-threshold" /></div>
                  <div><Label className="text-xs">Duration (days) *</Label><Input type="number" value={form.duration_days} onChange={(e) => setForm(p => ({ ...p, duration_days: e.target.value }))} required data-testid="input-duration" /></div>
                </div>
                <div><Label className="text-xs">Description</Label><textarea className="w-full border rounded-xl px-3 py-2.5 text-sm min-h-[60px]" value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} data-testid="input-description" /></div>
              </div>
            )}

            {/* Step 4: Promotion Settings */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">Promotion Settings</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Commission Mode</Label>
                    <select className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white" value={form.commission_mode} onChange={(e) => setForm(p => ({ ...p, commission_mode: e.target.value }))} data-testid="select-commission-mode">
                      <option value="none">None</option>
                      <option value="reduced_percentage">Reduced %</option>
                      <option value="fixed_bounty">Fixed Bounty</option>
                    </select>
                  </div>
                  {form.commission_mode !== "none" && <div><Label className="text-xs">Affiliate Share %</Label><Input type="number" value={form.affiliate_share_pct} onChange={(e) => setForm(p => ({ ...p, affiliate_share_pct: e.target.value }))} data-testid="input-affiliate-share" /></div>}
                </div>
              </div>
            )}

            {/* Step 5: Review & Publish */}
            {wizardStep === 5 && (
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">Review & Publish</Label>
                <div className="bg-slate-50 rounded-xl border p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Product:</span><span className="font-semibold">{selectedProduct?.name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Category:</span><span>{selectedProduct?.category}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Vendor Cost:</span><span>{fmt(form.vendor_cost)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Deal Price:</span><span className="font-bold text-emerald-600">{fmt(form.discounted_price)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Target Qty:</span><span>{form.display_target} units</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Duration:</span><span>{form.duration_days} days</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Commission:</span><span>{form.commission_mode === "none" ? "None" : `${form.commission_mode} (${form.affiliate_share_pct}%)`}</span></div>
                </div>
                <ProfitCalculator basePrice={form.original_price} vendorCost={form.vendor_cost} dealPrice={form.discounted_price} target={form.display_target} />
                {Number(form.discounted_price || 0) <= Number(form.vendor_cost || 0) && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                    Deal price is at or below vendor cost. This deal will result in a loss.
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-3 border-t">
              {wizardStep > 1 && (
                <Button type="button" variant="outline" onClick={() => setWizardStep(s => s - 1)} className="flex-1" data-testid="wizard-back">Back</Button>
              )}
              {wizardStep < 5 ? (
                <Button type="button" onClick={() => {
                  if (wizardStep === 1 && !selectedProduct) { toast.error("Select a product first"); return; }
                  if (wizardStep === 2 && (!form.vendor_cost || !form.discounted_price)) { toast.error("Set vendor cost and deal price"); return; }
                  if (wizardStep === 3 && (!form.display_target || !form.duration_days)) { toast.error("Set target and duration"); return; }
                  setWizardStep(s => s + 1);
                }} className="flex-1 bg-[#20364D]" data-testid="wizard-next">Next</Button>
              ) : (
                <Button type="submit" disabled={creating} className="flex-1 bg-[#D4A843] hover:bg-[#c49a3d] text-[#17283C] font-bold" data-testid="submit-campaign-btn">
                  {creating ? "Creating..." : "Publish Campaign"}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => { setShowCreate(false); setSelectedProduct(null); setWizardStep(1); }}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
