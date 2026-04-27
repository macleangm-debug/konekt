import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Plus, Clock, Check, X, Users, Package, RefreshCw, Star, Search, MessageCircle } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import QrCodeButton from "@/components/common/QrCodeButton";

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

export default function GroupDealsAdminPage({ embedded = false } = {}) {
  const [campaigns, setCampaigns] = useState([]);
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
  const [buyersFor, setBuyersFor] = useState(null); // { campaign, commitments }

  useEffect(() => { loadCampaigns(); }, []);

  const loadCampaigns = async () => {
    try {
      const r = await api.get("/api/admin/group-deals/campaigns");
      setCampaigns(r.data || []);
    } catch { toast.error("Failed to load campaigns"); }
    finally { setLoading(false); }
  };

  const approvePayment = async (ref) => {
    try {
      await api.post(`/api/admin/group-deals/commitments/${ref}/approve-payment`);
      toast.success("Payment approved");
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

  const openBuyers = async (campaign) => {
    setBuyersFor({ campaign, commitments: null });
    try {
      const r = await api.get(`/api/admin/group-deals/campaigns/${campaign.id}`);
      setBuyersFor({ campaign, commitments: r.data?.commitments || [] });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to load buyers");
      setBuyersFor({ campaign, commitments: [] });
    }
  };

  const [broadcastFor, setBroadcastFor] = useState(null); // { campaign, buyers, message, channel }
  const [payoutFor, setPayoutFor] = useState(null); // { campaign, reference }
  const [drawerFor, setDrawerFor] = useState(null); // { campaign details } — click row to open

  const openContact = async (campaign) => {
    const defaultMsg = `Hi {name}, this is Konekt. Thank you for joining "${campaign.product_name}" — `;
    setBroadcastFor({ campaign, buyers: null, message: defaultMsg, channel: "whatsapp" });
    try {
      const r = await api.get(`/api/admin/group-deals/campaigns/${campaign.id}`);
      const paid = (r.data?.commitments || []).filter(c => ["paid", "order_created", "refund_pending", "refunded"].includes(c.status) || c.status === "committed");
      setBroadcastFor(prev => prev ? { ...prev, buyers: paid } : null);
    } catch {
      setBroadcastFor(prev => prev ? { ...prev, buyers: [] } : null);
    }
  };

  const markVendorPayout = async (campaign, status, reference) => {
    try {
      await api.post(`/api/admin/group-deals/campaigns/${campaign.id}/vendor-payout`, { status, reference: reference || "" });
      toast.success(status === "paid" ? "Vendor marked as paid" : "Vendor payout reset to pending");
      setPayoutFor(null);
      loadCampaigns();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update payout");
    }
  };

  const logBroadcast = async (campaignId, channel, message, count) => {
    try {
      await api.post(`/api/admin/group-deals/campaigns/${campaignId}/broadcast`, { channel, message, recipient_count: count });
    } catch { /* non-blocking */ }
  };

  const stats = useMemo(() => {
    const now = Date.now();
    const isExpired = (c) => c.deadline && new Date(c.deadline).getTime() <= now;
    const live = campaigns.filter(c => c.status === "active" && !isExpired(c));
    const needsDecision = campaigns.filter(c => c.status === "active" && isExpired(c));
    const fulfillment = campaigns.filter(c => c.status === "finalized");
    const closed = campaigns.filter(c => c.status === "failed" || c.status === "cancelled" || c.status === "refunded");
    const totalMargin = fulfillment.reduce((s, c) => s + (c.total_margin || 0), 0);
    const totalNetProfit = fulfillment.reduce((s, c) => s + (c.konekt_net_profit || 0), 0);
    const pendingVendorPayouts = fulfillment.filter(c => (c.vendor_payout_status || "pending") === "pending").length;
    const pendingPaymentsTotal = campaigns.reduce((s, c) => s + (c.pending_payment_count || 0), 0);
    return { live, needsDecision, fulfillment, closed, totalMargin, totalNetProfit, pendingVendorPayouts, pendingPaymentsTotal };
  }, [campaigns]);

  const [stageTab, setStageTab] = useState("all");
  const [searchQ, setSearchQ] = useState("");

  const visibleCampaigns = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    let list = campaigns;
    if (stageTab === "live") list = stats.live;
    else if (stageTab === "needs_decision") list = stats.needsDecision;
    else if (stageTab === "fulfillment") list = stats.fulfillment;
    else if (stageTab === "closed") list = stats.closed;
    if (q) list = list.filter(c => (c.product_name || "").toLowerCase().includes(q) || (c.campaign_id || "").toLowerCase().includes(q));
    return list;
  }, [campaigns, stats, stageTab, searchQ]);

  return (
    <div className={embedded ? "space-y-5" : "p-6 space-y-5"} data-testid="group-deals-admin">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#20364D]">Group Deal Campaigns</h1>
          <p className="text-sm text-slate-500">Demand aggregation — commitments first, orders on finalize</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-[#20364D]" data-testid="create-campaign-btn">
          <Plus className="w-4 h-4 mr-2" /> New Campaign
        </Button>
      </div>

      {/* Summary stat cards — financial focus */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border p-4"><div className="text-2xl font-extrabold text-blue-600">{stats.live.length}</div><div className="text-xs text-slate-500">Live</div></div>
        <div className="bg-white rounded-xl border p-4"><div className="text-2xl font-extrabold text-red-600">{stats.needsDecision.length}</div><div className="text-xs text-slate-500">Needs Decision</div></div>
        <div className="bg-white rounded-xl border p-4"><div className="text-2xl font-extrabold text-amber-600">{stats.pendingPaymentsTotal}</div><div className="text-xs text-slate-500">Payments to approve</div></div>
        <div className="bg-white rounded-xl border p-4"><div className="text-2xl font-extrabold text-emerald-600">{stats.fulfillment.length}</div><div className="text-xs text-slate-500">In Fulfillment</div></div>
        <div className="bg-white rounded-xl border p-4"><div className="text-xl font-extrabold text-[#20364D]" title={fmt(stats.totalMargin)}>{fmt(stats.totalNetProfit)}</div><div className="text-xs text-slate-500">Net Profit (finalized)</div></div>
        <div className="bg-white rounded-xl border p-4"><div className="text-2xl font-extrabold text-amber-600">{stats.pendingVendorPayouts}</div><div className="text-xs text-slate-500">Vendor Payouts Due</div></div>
      </div>

      {/* Needs Decision banner — only when something requires action */}
      {stats.needsDecision.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-amber-50 border-l-4 border-red-400 rounded-xl p-4 flex items-start gap-3" data-testid="needs-decision-banner">
          <div className="text-red-500 text-xl">⚠️</div>
          <div className="flex-1">
            <div className="text-sm font-bold text-red-800">{stats.needsDecision.length} campaign{stats.needsDecision.length > 1 ? "s" : ""} need your decision</div>
            <div className="text-xs text-red-700 mt-0.5">Expired campaigns — push to sales (if threshold met) or cancel & refund. Contact buyers either way.</div>
          </div>
          <Button size="sm" variant="outline" className="border-red-300 text-red-700" onClick={() => setStageTab("needs_decision")} data-testid="goto-needs-decision">Review now →</Button>
        </div>
      )}

      {/* Stage Tabs + Search */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-white border rounded-xl p-1" data-testid="stage-tabs">
          {[
            { k: "all", label: `All (${campaigns.length})` },
            { k: "live", label: `Live (${stats.live.length})` },
            { k: "needs_decision", label: `Needs Decision (${stats.needsDecision.length})`, warn: stats.needsDecision.length > 0 },
            { k: "fulfillment", label: `In Fulfillment (${stats.fulfillment.length})` },
            { k: "closed", label: `Closed (${stats.closed.length})` },
          ].map(t => (
            <button key={t.k} onClick={() => setStageTab(t.k)}
              data-testid={`stage-tab-${t.k}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                stageTab === t.k
                  ? "bg-[#20364D] text-white"
                  : t.warn ? "text-red-600 hover:bg-red-50" : "text-slate-600 hover:bg-slate-50"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9 h-9 text-sm" placeholder="Search campaigns..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)} data-testid="campaign-search" />
        </div>
      </div>

      {/* Campaign List — Desktop Table + Mobile Cards */}
      {loading ? <div className="text-slate-500 p-8 text-center">Loading...</div> :
        visibleCampaigns.length === 0 ? <div className="text-slate-400 p-8 text-center bg-white rounded-xl border">No campaigns in this stage.</div> : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl border overflow-hidden">
            <table className="w-full text-sm" data-testid="campaigns-table">
              <thead className="bg-slate-50 border-b">
                <tr className="text-xs uppercase tracking-wider text-slate-500">
                  <th className="text-left py-2.5 px-4 font-semibold">Product</th>
                  <th className="text-right py-2.5 px-3 font-semibold">Price</th>
                  <th className="text-left py-2.5 px-3 font-semibold w-44">Progress</th>
                  <th className="text-right py-2.5 px-3 font-semibold">Buyers</th>
                  <th className="text-right py-2.5 px-3 font-semibold">Payments</th>
                  <th className="text-right py-2.5 px-3 font-semibold">Revenue</th>
                  <th className="text-left py-2.5 px-3 font-semibold">Status</th>
                  <th className="text-left py-2.5 px-3 font-semibold">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {visibleCampaigns.map((c) => {
                  const progress = c.display_target > 0 ? Math.round((c.current_committed / c.display_target) * 100) : 0;
                  const daysLeft = c.deadline ? Math.max(0, Math.ceil((new Date(c.deadline) - new Date()) / 86400000)) : 0;
                  const hoursLeft = c.deadline ? Math.max(0, Math.ceil((new Date(c.deadline) - new Date()) / 3600000)) : 0;
                  const isExpired = c.status === "active" && c.deadline && new Date(c.deadline) <= new Date();
                  const thresholdReady = c.status === "active" && c.threshold_met;
                  const sc = statusConfig[c.status] || statusConfig.active;
                  return (
                    <tr key={c.id}
                        className={`border-b last:border-0 cursor-pointer hover:bg-slate-50 transition ${isExpired ? "bg-red-50/30" : thresholdReady ? "bg-amber-50/30" : ""}`}
                        onClick={() => setDrawerFor(c)}
                        data-testid={`campaign-row-${c.id}`}>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#20364D] truncate max-w-[240px]">{c.product_name}</div>
                        <div className="text-[11px] text-slate-400">{c.campaign_id} • {c.category || "Uncategorized"}</div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-[#D4A843]">{fmt(c.discounted_price)}</div>
                        <div className="text-[10px] text-slate-400 line-through">{fmt(c.original_price)}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${progress >= 100 ? "bg-green-500" : progress >= 60 ? "bg-blue-500" : "bg-amber-400"}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">{fmtNum(c.current_committed)}/{fmtNum(c.display_target)} ({progress}%)</div>
                      </td>
                      <td className="py-3 px-3 text-right">{c.buyer_count || 0}</td>
                      <td className="py-3 px-3 text-right">
                        {c.pending_payment_count > 0 ? (
                          <Badge className="bg-amber-100 text-amber-700 font-bold" data-testid={`pending-pay-${c.id}`}>
                            {c.pending_payment_count} to approve
                          </Badge>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold">
                        {c.status === "finalized" ? fmt(c.buyer_total_revenue || 0) : fmt((c.current_committed || 0) * (c.discounted_price || 0))}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1">
                          <Badge className={`${sc.color} w-fit`}>{sc.label}</Badge>
                          {isExpired && <Badge className="bg-red-100 text-red-700 w-fit text-[10px]">Expired</Badge>}
                          {thresholdReady && <Badge className="bg-amber-100 text-amber-700 w-fit text-[10px] animate-pulse">Threshold</Badge>}
                          {c.is_featured && <Badge className="bg-yellow-100 text-yellow-700 w-fit text-[10px]">Featured</Badge>}
                          {c.status === "finalized" && (c.vendor_payout_status || "pending") === "paid" && <Badge className="bg-emerald-100 text-emerald-700 w-fit text-[10px]">Vendor paid</Badge>}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">
                        {c.status === "active" && !isExpired ? (daysLeft > 0 ? `${daysLeft}d left` : `${hoursLeft}h left`)
                          : c.deadline ? new Date(c.deadline).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards — one card per deal, click to open drawer with everything */}
          <div className="md:hidden space-y-2">
            {visibleCampaigns.map((c) => {
              const progress = c.display_target > 0 ? Math.round((c.current_committed / c.display_target) * 100) : 0;
              const daysLeft = c.deadline ? Math.max(0, Math.ceil((new Date(c.deadline) - new Date()) / 86400000)) : 0;
              const isExpired = c.status === "active" && c.deadline && new Date(c.deadline) <= new Date();
              const thresholdReady = c.status === "active" && c.threshold_met;
              const sc = statusConfig[c.status] || statusConfig.active;
              return (
                <button key={c.id}
                  onClick={() => setDrawerFor(c)}
                  className={`w-full text-left bg-white rounded-xl border p-3.5 hover:border-[#20364D]/40 transition ${isExpired ? "border-red-300 bg-red-50/40" : thresholdReady ? "border-amber-300 bg-amber-50/30" : ""}`}
                  data-testid={`campaign-card-${c.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-[#20364D] truncate">{c.product_name}</div>
                      <div className="text-[11px] text-slate-400">{c.campaign_id}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge className={`${sc.color} text-[10px]`}>{sc.label}</Badge>
                      {isExpired && <Badge className="bg-red-100 text-red-700 text-[9px]">Expired</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="font-bold text-[#D4A843]">{fmt(c.discounted_price)}</span>
                    <span className="text-slate-500">{c.buyer_count || 0} buyers • {fmtNum(c.current_committed)}/{fmtNum(c.display_target)}</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${progress >= 100 ? "bg-green-500" : progress >= 60 ? "bg-blue-500" : "bg-amber-400"}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-slate-400">{c.status === "active" ? `${daysLeft}d left` : c.status === "finalized" ? `Net ${fmt(c.konekt_net_profit || 0)}` : ""}</span>
                    <span className="text-[10px] text-[#20364D] font-semibold">Tap for details →</span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

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
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">Affiliate & Sales Commission</Label>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
                  Group deals use a flat <b>affiliate commission</b> on the profit margin. Whoever's promo code (affiliate or salesperson) the buyer used gets credited. Empty = use platform default from <i>Admin Settings → Group Deals</i>.
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label className="text-xs">Affiliate commission % (of profit margin, before VAT)</Label>
                    <Input
                      type="number" step="0.1" min="0" max="50"
                      placeholder="Leave empty for platform default (5%)"
                      value={form.affiliate_share_pct}
                      onChange={(e) => setForm(p => ({ ...p, affiliate_share_pct: e.target.value }))}
                      data-testid="input-affiliate-share"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Commissions below the platform minimum payout floor (default TZS 50,000 per person per deal) are skipped. Credited on finalize.</p>
                  </div>
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
                  <div className="flex justify-between"><span className="text-slate-500">Affiliate commission:</span><span>{Number(form.affiliate_share_pct) > 0 ? `${form.affiliate_share_pct}% of margin` : "Platform default (5%)"}</span></div>
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

      {/* Campaign Drawer — click row/card to open; contains ALL details + actions in one place */}
      <Dialog open={!!drawerFor} onOpenChange={(v) => !v && setDrawerFor(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0" data-testid="campaign-drawer">
          {drawerFor && (() => {
            const c = drawerFor;
            const progress = c.display_target > 0 ? Math.round((c.current_committed / c.display_target) * 100) : 0;
            const daysLeft = c.deadline ? Math.max(0, Math.ceil((new Date(c.deadline) - new Date()) / 86400000)) : 0;
            const hoursLeft = c.deadline ? Math.max(0, Math.ceil((new Date(c.deadline) - new Date()) / 3600000)) : 0;
            const isExpired = c.status === "active" && c.deadline && new Date(c.deadline) <= new Date();
            const thresholdReady = c.status === "active" && c.threshold_met;
            const sc = statusConfig[c.status] || statusConfig.active;
            return (
              <>
                <div className="px-6 pt-5 pb-4 border-b">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-bold text-[#20364D] truncate">{c.product_name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{c.campaign_id} • {c.category || "Uncategorized"}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <Badge className={sc.color}>{sc.label}</Badge>
                      {isExpired && <Badge className="bg-red-100 text-red-700">Expired</Badge>}
                      {thresholdReady && <Badge className="bg-amber-100 text-amber-700 animate-pulse">Threshold met</Badge>}
                      {c.is_featured && <Badge className="bg-yellow-100 text-yellow-700">Featured</Badge>}
                    </div>
                  </div>
                  {c.description && <p className="text-sm text-slate-600 mt-2">{c.description}</p>}
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                  {/* Progress bar + countdown */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-600 font-semibold">{fmtNum(c.current_committed)} of {fmtNum(c.display_target)} units • {c.buyer_count || 0} buyers</span>
                      <span className="text-slate-500">{c.status === "active" ? (isExpired ? "Deadline passed" : (daysLeft > 0 ? `${daysLeft}d left` : `${hoursLeft}h left`)) : c.deadline ? `Ended ${new Date(c.deadline).toLocaleDateString()}` : ""}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${progress >= 100 ? "bg-green-500" : progress >= 60 ? "bg-blue-500" : "bg-amber-400"}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>
                  </div>

                  {/* Pricing + Margin */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="bg-slate-50 rounded-xl p-3"><div className="text-[10px] uppercase tracking-wider text-slate-400">Deal price</div><div className="font-bold text-[#D4A843] mt-0.5">{fmt(c.discounted_price)}</div><div className="text-[10px] text-slate-400 line-through">{fmt(c.original_price)}</div></div>
                    <div className="bg-slate-50 rounded-xl p-3"><div className="text-[10px] uppercase tracking-wider text-slate-400">Vendor cost</div><div className="font-bold text-red-600 mt-0.5">{fmt(c.vendor_cost)}</div><div className="text-[10px] text-slate-400">per unit</div></div>
                    <div className="bg-slate-50 rounded-xl p-3"><div className="text-[10px] uppercase tracking-wider text-slate-400">Margin</div><div className="font-bold mt-0.5">{fmt(c.margin_per_unit)}</div><div className="text-[10px] text-slate-400">({c.margin_pct}%)</div></div>
                    <div className="bg-slate-50 rounded-xl p-3"><div className="text-[10px] uppercase tracking-wider text-slate-400">Revenue so far</div><div className="font-bold mt-0.5">{fmt(c.status === "finalized" ? (c.buyer_total_revenue || 0) : (c.current_committed || 0) * (c.discounted_price || 0))}</div></div>
                  </div>

                  {/* P&L breakdown — finalized only */}
                  {c.status === "finalized" && c.vbo_number && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2" data-testid={`drawer-pnl-${c.id}`}>
                      <div className="flex items-center justify-between text-sm font-bold text-emerald-800">
                        <span className="flex items-center gap-1.5"><Package className="w-4 h-4" /> Finalized — VBO {c.vbo_number}</span>
                        <span>{c.orders_created || 0} orders • {fmtNum(c.total_units_ordered || 0)} units</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        <div><div className="text-[10px] uppercase tracking-wider text-slate-500">Revenue</div><div className="font-semibold">{fmt(c.buyer_total_revenue || 0)}</div></div>
                        <div><div className="text-[10px] uppercase tracking-wider text-slate-500">Vendor cost</div><div className="font-semibold text-red-600">-{fmt(c.vendor_total_cost || 0)}</div></div>
                        <div><div className="text-[10px] uppercase tracking-wider text-slate-500">Gross margin</div><div className="font-semibold">{fmt(c.total_margin || 0)}</div></div>
                        <div><div className="text-[10px] uppercase tracking-wider text-slate-500">Commissions ({c.applied_affiliate_pct || 0}%)</div><div className="font-semibold text-orange-600">-{fmt(c.total_commission_paid || 0)}</div></div>
                        <div><div className="text-[10px] uppercase tracking-wider text-slate-500">Konekt net</div><div className="font-extrabold text-emerald-700">{fmt(c.konekt_net_profit || 0)}</div></div>
                      </div>

                      {/* Vendor payout strip */}
                      <div className="flex items-center justify-between pt-2 border-t border-emerald-200 mt-2">
                        <div className="text-xs">
                          <div className="text-slate-600 font-semibold">Vendor payout • {c.vendor_name || "Unassigned vendor"}</div>
                          {c.vendor_payout_paid_at && <div className="text-[10px] text-slate-500">Paid on {new Date(c.vendor_payout_paid_at).toLocaleDateString()} • Ref: {c.vendor_payout_reference || "—"}</div>}
                        </div>
                        {(c.vendor_payout_status || "pending") === "paid" ? (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-100 text-emerald-700">Paid</Badge>
                            <button className="text-[11px] text-slate-400 hover:text-red-600 underline" onClick={() => markVendorPayout(c, "pending")} data-testid={`drawer-payout-reset-${c.id}`}>Reset</button>
                          </div>
                        ) : (
                          <Button size="sm" onClick={() => setPayoutFor({ campaign: c, reference: "" })} className="bg-amber-500 hover:bg-amber-600 h-8" data-testid={`drawer-mark-payout-${c.id}`}>
                            Mark vendor paid
                          </Button>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600 bg-white rounded-lg px-2 py-1.5 border">
                        The vendor sees this as a <b>Group Deal</b> aggregated order in their dashboard, with no client details — only the total quantity to prepare. When you mark them paid here, their dashboard updates too.
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div><span className="text-slate-400">Vendor threshold:</span> {fmtNum(c.vendor_threshold || 0)} units</div>
                    <div><span className="text-slate-400">Deadline:</span> {c.deadline ? new Date(c.deadline).toLocaleString() : "—"}</div>
                    <div><span className="text-slate-400">Created:</span> {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}</div>
                    <div><span className="text-slate-400">Affiliate commission:</span> {c.applied_affiliate_pct || c.affiliate_share_pct || 5}% of margin</div>
                  </div>
                </div>

                {/* Action footer */}
                <div className="px-6 py-3 border-t bg-slate-50 flex flex-wrap gap-2" data-testid="drawer-actions">
                  <Button size="sm" variant="outline" onClick={() => { setDrawerFor(null); openBuyers(c); }} data-testid={`drawer-view-buyers-${c.id}`}>
                    <Users className="w-3.5 h-3.5 mr-1" /> View buyers ({c.buyer_count || 0})
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setDrawerFor(null); openContact(c); }} data-testid={`drawer-contact-${c.id}`}>
                    <MessageCircle className="w-3.5 h-3.5 mr-1" /> Contact buyers
                  </Button>
                  <QrCodeButton kind="group_deal" id={c.id} label="QR" />
                  {thresholdReady && (
                    <Button size="sm" onClick={() => { finalizeCampaign(c.id); setDrawerFor(null); }} className="bg-green-600 hover:bg-green-700" data-testid={`drawer-finalize-${c.id}`}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Push to Sales
                    </Button>
                  )}
                  {c.status === "active" && !thresholdReady && isExpired && (c.current_committed || 0) >= (c.vendor_threshold || 0) && (
                    <Button size="sm" onClick={() => { finalizeCampaign(c.id); setDrawerFor(null); }} className="bg-green-600 hover:bg-green-700" data-testid={`drawer-finalize-expired-${c.id}`}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Push to Sales
                    </Button>
                  )}
                  {c.status === "active" && (
                    <Button size="sm" variant="outline" onClick={() => toggleFeatured(c.id, c.is_featured)}
                      className={c.is_featured ? "text-amber-600 border-amber-300 bg-amber-50" : "text-slate-600"} data-testid={`drawer-featured-${c.id}`}>
                      <Star className={`w-3.5 h-3.5 mr-1 ${c.is_featured ? "fill-amber-500" : ""}`} /> {c.is_featured ? "Featured" : "Set featured"}
                    </Button>
                  )}
                  {c.status === "active" && (
                    <Button size="sm" variant="outline" onClick={() => { cancelCampaign(c.id); setDrawerFor(null); }} className="text-red-600 border-red-200" data-testid={`drawer-cancel-${c.id}`}>
                      <X className="w-3.5 h-3.5 mr-1" /> {isExpired ? "Close & refund" : "Cancel"}
                    </Button>
                  )}
                  {c.status === "failed" && (
                    <Button size="sm" onClick={() => { processRefunds(c.id); setDrawerFor(null); }} className="bg-orange-600 hover:bg-orange-700" data-testid={`drawer-refund-${c.id}`}>
                      <RefreshCw className="w-3.5 h-3.5 mr-1" /> Process refunds
                    </Button>
                  )}
                  <div className="flex-1" />
                  <Button size="sm" variant="outline" onClick={() => setDrawerFor(null)}>Close</Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* View Buyers Modal */}
      <Dialog open={!!buyersFor} onOpenChange={(v) => !v && setBuyersFor(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" data-testid="buyers-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#20364D]" /> Buyers — {buyersFor?.campaign?.product_name}
            </DialogTitle>
            <DialogDescription>
              {buyersFor?.campaign?.campaign_id} • {buyersFor?.campaign?.buyer_count || 0} buyers • {fmtNum(buyersFor?.campaign?.current_committed || 0)} units committed
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto -mx-1 px-1">
            {!buyersFor?.commitments ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading buyers…</div>
            ) : buyersFor.commitments.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No commitments yet.</div>
            ) : (
              <table className="w-full text-sm" data-testid="buyers-table">
                <thead className="sticky top-0 bg-white border-b">
                  <tr className="text-xs uppercase tracking-wider text-slate-400">
                    <th className="text-left py-2 px-3 font-semibold">Customer</th>
                    <th className="text-left py-2 px-3 font-semibold">Phone</th>
                    <th className="text-right py-2 px-3 font-semibold">Qty</th>
                    <th className="text-right py-2 px-3 font-semibold">Amount</th>
                    <th className="text-left py-2 px-3 font-semibold">Status</th>
                    <th className="text-left py-2 px-3 font-semibold">Joined</th>
                    <th className="text-right py-2 px-3 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {buyersFor.commitments.map((b, i) => {
                    const statusColor = {
                      paid: "bg-emerald-100 text-emerald-700",
                      payment_submitted: "bg-amber-100 text-amber-700",
                      pending: "bg-slate-100 text-slate-600",
                      refund_pending: "bg-orange-100 text-orange-700",
                      refunded: "bg-blue-100 text-blue-700",
                      cancelled: "bg-red-100 text-red-700",
                    }[b.status] || "bg-slate-100 text-slate-600";
                    const statusLabel = {
                      paid: "Paid",
                      payment_submitted: "Payment submitted",
                      pending: "Pending",
                      refund_pending: "Refund pending",
                      refunded: "Refunded",
                      cancelled: "Cancelled",
                    }[b.status] || b.status;
                    return (
                      <tr key={i} className="border-b last:border-0 hover:bg-slate-50" data-testid={`buyer-row-${i}`}>
                        <td className="py-2 px-3 font-semibold text-[#20364D]">{b.customer_name || "—"}</td>
                        <td className="py-2 px-3 text-slate-600">{b.customer_phone || "—"}</td>
                        <td className="py-2 px-3 text-right">{fmtNum(b.quantity)}</td>
                        <td className="py-2 px-3 text-right font-mono">{fmt(b.amount)}</td>
                        <td className="py-2 px-3"><Badge className={statusColor}>{statusLabel}</Badge></td>
                        <td className="py-2 px-3 text-xs text-slate-400">{b.created_at ? new Date(b.created_at).toLocaleString() : "—"}</td>
                        <td className="py-2 px-3 text-right">
                          {b.status === "payment_submitted" && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs"
                              onClick={async () => {
                                await approvePayment(b.commitment_ref);
                                // Refresh buyer list in modal
                                try {
                                  const r = await api.get(`/api/admin/group-deals/campaigns/${buyersFor.campaign.id}`);
                                  setBuyersFor({ campaign: buyersFor.campaign, commitments: r.data?.commitments || [] });
                                } catch { /* no-op */ }
                              }}
                              data-testid={`approve-buyer-${i}`}>
                              <Check className="w-3 h-3 mr-1" /> Approve
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="text-xs text-slate-500">
              {buyersFor?.commitments && `${buyersFor.commitments.filter(b => b.status === "paid").length} paid • ${buyersFor.commitments.filter(b => b.status === "payment_submitted").length} awaiting approval • ${buyersFor.commitments.filter(b => b.status === "pending").length} pending`}
            </div>
            <Button variant="outline" onClick={() => setBuyersFor(null)} data-testid="buyers-modal-close">Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Buyers Modal — WhatsApp/Email blast helper */}
      <Dialog open={!!broadcastFor} onOpenChange={(v) => !v && setBroadcastFor(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" data-testid="contact-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-[#20364D]" /> Contact buyers — {broadcastFor?.campaign?.product_name}</DialogTitle>
            <DialogDescription>
              Use <code className="px-1 bg-slate-100 rounded text-[11px]">{'{name}'}</code> to personalize. WhatsApp opens each buyer in a new tab; you confirm & send. For bulk email, use "Copy all emails" and paste into your email client's BCC field.
            </DialogDescription>
          </DialogHeader>
          {!broadcastFor?.buyers ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading buyers…</div>
          ) : (
            <>
              <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                <div>
                  <Label className="text-xs">Channel</Label>
                  <div className="flex gap-2 mt-1">
                    {["whatsapp", "email", "manual"].map(ch => (
                      <button key={ch}
                        onClick={() => setBroadcastFor(prev => ({ ...prev, channel: ch }))}
                        data-testid={`broadcast-channel-${ch}`}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${broadcastFor.channel === ch ? "bg-[#20364D] text-white" : "bg-slate-100 text-slate-600"}`}>
                        {ch === "whatsapp" ? "WhatsApp" : ch === "email" ? "Email" : "Manual / log only"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Message template</Label>
                  <textarea
                    rows={5}
                    value={broadcastFor.message}
                    onChange={(e) => setBroadcastFor(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full mt-1 border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#20364D]/20"
                    data-testid="broadcast-message"
                  />
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600">
                  <div className="font-semibold text-slate-700 mb-1">{broadcastFor.buyers.length} recipients</div>
                  <div className="max-h-32 overflow-y-auto space-y-0.5">
                    {broadcastFor.buyers.map((b, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="truncate">{b.customer_name || "—"}</span>
                        <span className="text-slate-400 ml-3">{b.customer_phone || b.customer_email || "no contact"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t">
                <Button size="sm" variant="outline" onClick={() => {
                  const txt = broadcastFor.buyers.map(b => b.customer_phone).filter(Boolean).join("\n");
                  navigator.clipboard.writeText(txt);
                  toast.success("Phone numbers copied");
                }} data-testid="copy-phones">Copy phones</Button>
                <Button size="sm" variant="outline" onClick={() => {
                  const txt = broadcastFor.buyers.map(b => b.customer_email).filter(Boolean).join(", ");
                  navigator.clipboard.writeText(txt);
                  toast.success("Emails copied");
                }} data-testid="copy-emails">Copy emails (BCC)</Button>
                <Button size="sm" variant="outline" onClick={() => {
                  navigator.clipboard.writeText(broadcastFor.message);
                  toast.success("Message copied");
                }} data-testid="copy-message">Copy message</Button>
                <div className="flex-1" />
                {broadcastFor.channel === "whatsapp" && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={async () => {
                    const buyers = broadcastFor.buyers.filter(b => b.customer_phone);
                    if (!buyers.length) { toast.error("No buyers with phone numbers"); return; }
                    buyers.forEach((b, i) => {
                      const msg = (broadcastFor.message || "").replaceAll("{name}", b.customer_name || "there");
                      const phone = String(b.customer_phone).replace(/[^0-9]/g, "");
                      setTimeout(() => {
                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
                      }, i * 250);
                    });
                    await logBroadcast(broadcastFor.campaign.id, "whatsapp", broadcastFor.message, buyers.length);
                    toast.success(`Opened WhatsApp for ${buyers.length} buyer(s)`);
                  }} data-testid="send-whatsapp">Open WhatsApp ({broadcastFor.buyers.filter(b => b.customer_phone).length})</Button>
                )}
                {broadcastFor.channel === "email" && (
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={async () => {
                    const buyers = broadcastFor.buyers.filter(b => b.customer_email);
                    if (!buyers.length) { toast.error("No buyers with email addresses"); return; }
                    const emails = buyers.map(b => b.customer_email).join(",");
                    const subject = `Update on your group deal: ${broadcastFor.campaign.product_name}`;
                    const body = (broadcastFor.message || "").replaceAll("{name}", "there");
                    window.location.href = `mailto:?bcc=${emails}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    await logBroadcast(broadcastFor.campaign.id, "email", broadcastFor.message, buyers.length);
                  }} data-testid="send-email">Open email client ({broadcastFor.buyers.filter(b => b.customer_email).length})</Button>
                )}
                {broadcastFor.channel === "manual" && (
                  <Button size="sm" className="bg-[#20364D]" onClick={async () => {
                    await logBroadcast(broadcastFor.campaign.id, "manual", broadcastFor.message, broadcastFor.buyers.length);
                    toast.success("Broadcast logged");
                    setBroadcastFor(null);
                  }} data-testid="log-broadcast">Log & close</Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setBroadcastFor(null)}>Close</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Vendor Payout Modal */}
      <Dialog open={!!payoutFor} onOpenChange={(v) => !v && setPayoutFor(null)}>
        <DialogContent className="sm:max-w-md" data-testid="payout-modal">
          <DialogHeader>
            <DialogTitle>Mark vendor as paid</DialogTitle>
            <DialogDescription>Record the vendor payout reference (bank transfer ref, mobile money transaction ID, etc.)</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <div className="text-xs text-slate-500">Vendor cost for this campaign:</div>
              <div className="font-extrabold text-lg text-[#20364D]">{fmt(payoutFor?.campaign?.vendor_total_cost || 0)}</div>
            </div>
            <div>
              <Label className="text-xs">Payment reference (optional)</Label>
              <Input value={payoutFor?.reference || ""} onChange={(e) => setPayoutFor(prev => ({ ...prev, reference: e.target.value }))} placeholder="e.g. TXN-9238474 or bank slip #" data-testid="payout-reference" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPayoutFor(null)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => markVendorPayout(payoutFor.campaign, "paid", payoutFor.reference)} data-testid="confirm-payout">Confirm Paid</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
