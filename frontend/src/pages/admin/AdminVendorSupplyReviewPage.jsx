import React, { useEffect, useState, useCallback } from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, XCircle, Clock, Package, Search, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";

const money = (v) => `TZS ${Number(v || 0).toLocaleString("en-US")}`;

const HEALTH_CONFIG = {
  critical: { bg: "bg-red-100 text-red-700", icon: XCircle, dot: "bg-red-500" },
  warning: { bg: "bg-amber-100 text-amber-700", icon: AlertTriangle, dot: "bg-amber-500" },
  healthy: { bg: "bg-emerald-100 text-emerald-700", icon: CheckCircle2, dot: "bg-emerald-500" },
};

export default function AdminVendorSupplyReviewPage() {
  const [data, setData] = useState({ products: [], stats: {}, pricing_integrity: {}, margin_settings: {} });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [actionProduct, setActionProduct] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [overridePrice, setOverridePrice] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const param = filter !== "all" ? `?filter=${filter}` : "";
      const res = await api.get(`/api/admin/vendor-supply/review-dashboard${param}`);
      setData(res.data || {});
    } catch { toast.error("Failed to load"); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const filtered = (data.products || []).filter((p) =>
    !search || [p.name, p.category, p.vendor_name, p.sku].some((f) => (f || "").toLowerCase().includes(search.toLowerCase()))
  );

  const stats = data.stats || {};
  const integrity = data.pricing_integrity || {};

  const approveProduct = async (productId, overrideSellPrice) => {
    setSaving(true);
    try {
      const payload = { status: "active" };
      if (overrideSellPrice) {
        payload.override_sell_price = parseFloat(overrideSellPrice);
        payload.override_reason = overrideReason;
      }
      const res = await api.post(`/api/admin/vendor-supply/products/${productId}/approve-pricing`, payload);
      toast.success(`Approved! Sell price: ${money(res.data.sell_price)}`);
      setActionProduct(null);
      setActionType(null);
      setOverridePrice("");
      setOverrideReason("");
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    setSaving(false);
  };

  const rejectProduct = async (productId) => {
    setSaving(true);
    try {
      await api.post(`/api/admin/vendor-supply/products/${productId}/reject`, { reason: rejectReason });
      toast.success("Product rejected");
      setActionProduct(null);
      setActionType(null);
      setRejectReason("");
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    setSaving(false);
  };

  return (
    <div className="space-y-5" data-testid="supply-review-page">
      <div>
        <h1 className="text-2xl font-bold text-[#20364D]">Supply Review</h1>
        <p className="text-sm text-slate-500 mt-0.5">Control tower for product pricing, data quality, and approval</p>
      </div>

      {/* Pricing Integrity Check */}
      <div className={`rounded-xl border p-4 flex items-center gap-4 ${integrity.not_using_engine > 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`} data-testid="pricing-integrity">
        {integrity.not_using_engine > 0 ? (
          <ShieldAlert className="w-8 h-8 text-red-500 flex-shrink-0" />
        ) : (
          <ShieldCheck className="w-8 h-8 text-emerald-500 flex-shrink-0" />
        )}
        <div>
          <div className="text-sm font-bold text-[#20364D]">Pricing Integrity: {integrity.integrity_pct || 0}%</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {integrity.using_engine || 0} products using pricing engine
            {integrity.not_using_engine > 0 && (
              <span className="text-red-600 font-semibold"> \u2022 {integrity.not_using_engine} products NOT using pricing engine</span>
            )}
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Pending", value: stats.pending || 0, color: "text-amber-600", bg: "border-amber-200" },
          { label: "Pricing Issues", value: stats.pricing_issues || 0, color: "text-red-600", bg: "border-red-200" },
          { label: "Missing Data", value: stats.missing_data || 0, color: "text-blue-600", bg: "border-blue-200" },
          { label: "Healthy", value: stats.healthy || 0, color: "text-emerald-600", bg: "border-emerald-200" },
        ].map((s) => (
          <div key={s.label} className={`bg-white rounded-xl border ${s.bg} p-3 text-center`} data-testid={`stat-${s.label.toLowerCase().replace(" ", "-")}`}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg border bg-white overflow-hidden">
          {[
            { key: "all", label: "All" },
            { key: "pricing_issues", label: "Pricing Issues" },
            { key: "missing_data", label: "Missing Data" },
            { key: "pending", label: "Pending" },
            { key: "ready", label: "Ready to Approve" },
          ].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-2 text-xs font-semibold transition ${filter === f.key ? "bg-[#20364D] text-white" : "text-slate-500 hover:bg-slate-50"}`} data-testid={`filter-${f.key}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} products</span>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" data-testid="review-table">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Product</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-600 uppercase">Base Price</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-600 uppercase">Sell Price</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-600 uppercase">Margin</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-600 uppercase">Source</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-600 uppercase">Health</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-600 uppercase">Data</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-400"><Package className="w-8 h-8 mx-auto mb-2 text-slate-200" />No products match this filter</td></tr>
                ) : filtered.map((p) => {
                  const hc = HEALTH_CONFIG[p.pricing_health] || HEALTH_CONFIG.healthy;
                  const isExpanded = actionProduct === p.id;
                  return (
                    <React.Fragment key={p.id}>
                      <tr className={`border-b border-slate-50 hover:bg-slate-50/50 ${p.pricing_health === "critical" ? "bg-red-50/30" : ""}`} data-testid={`product-row-${p.id}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" loading="lazy" /> : <ImageIcon className="w-4 h-4 text-slate-300" />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-[#20364D] truncate max-w-[180px]">{p.name}</div>
                              <div className="text-[10px] text-slate-400">{p.category} {p.vendor_name ? `\u2022 ${p.vendor_name}` : ""}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-xs">{p.vendor_cost > 0 ? money(p.vendor_cost) : <span className="text-slate-300">\u2014</span>}</td>
                        <td className="px-3 py-3 text-right text-xs font-medium">{p.selling_price > 0 ? money(p.selling_price) : <span className="text-red-500 font-semibold">Missing</span>}</td>
                        <td className="px-3 py-3 text-right">
                          {p.margin_pct > 0 ? (
                            <span className={`text-xs font-semibold ${p.margin_pct < (data.margin_settings?.default_min_pct || 15) ? "text-red-600" : "text-emerald-600"}`}>
                              {p.margin_pct}%
                            </span>
                          ) : <span className="text-slate-300 text-xs">\u2014</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {p.pricing_rule_source ? (
                            <Badge className="text-[9px] bg-blue-100 text-blue-700">{p.pricing_rule_source === "global_default" ? "Tier" : p.pricing_rule_source}</Badge>
                          ) : (
                            <Badge className="text-[9px] bg-slate-100 text-slate-500">None</Badge>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className={`w-2.5 h-2.5 rounded-full mx-auto ${hc.dot}`} title={p.pricing_health} />
                        </td>
                        <td className="px-3 py-3 text-center">
                          {p.missing_data?.length > 0 ? (
                            <span className="text-[9px] text-amber-600 font-semibold">{p.missing_data.length} missing</span>
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Badge className={`text-[9px] capitalize ${p.status === "active" ? "bg-emerald-100 text-emerald-700" : p.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                            {p.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {p.status !== "active" && p.status !== "rejected" && (
                              <button onClick={() => { setActionProduct(p.id); setActionType("approve"); }} className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-semibold hover:bg-emerald-700 transition" data-testid={`approve-${p.id}`}>
                                Approve
                              </button>
                            )}
                            {p.status !== "rejected" && (
                              <button onClick={() => { setActionProduct(p.id); setActionType("reject"); }} className="px-2 py-1 rounded-lg bg-red-100 text-red-700 text-[10px] font-semibold hover:bg-red-200 transition" data-testid={`reject-${p.id}`}>
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Action Panel */}
                      {isExpanded && (
                        <tr className="bg-slate-50 border-b">
                          <td colSpan={9} className="px-4 py-3" data-testid={`action-panel-${p.id}`}>
                            {actionType === "approve" && (
                              <div className="space-y-3">
                                <div className="grid md:grid-cols-4 gap-3 text-xs">
                                  <div className="bg-white rounded-lg border p-2.5">
                                    <div className="text-[10px] font-semibold text-slate-400 uppercase">Base Price</div>
                                    <div className="font-bold text-[#20364D] mt-0.5">{money(p.vendor_cost)}</div>
                                  </div>
                                  <div className="bg-white rounded-lg border p-2.5">
                                    <div className="text-[10px] font-semibold text-slate-400 uppercase">Expected Sell Price</div>
                                    <div className="font-bold text-[#20364D] mt-0.5">{money(p.expected_sell_price)}</div>
                                    <div className="text-[9px] text-slate-400">Target: {data.margin_settings?.default_target_pct || 30}%</div>
                                  </div>
                                  <div className="bg-white rounded-lg border p-2.5">
                                    <div className="text-[10px] font-semibold text-slate-400 uppercase">Min Sell Price</div>
                                    <div className="font-bold text-amber-600 mt-0.5">{money(p.min_sell_price)}</div>
                                    <div className="text-[9px] text-slate-400">Min: {data.margin_settings?.default_min_pct || 15}%</div>
                                  </div>
                                  <div className="bg-white rounded-lg border p-2.5">
                                    <div className="text-[10px] font-semibold text-slate-400 uppercase">Current Sell Price</div>
                                    <div className="font-bold text-[#20364D] mt-0.5">{p.selling_price > 0 ? money(p.selling_price) : "Not set"}</div>
                                  </div>
                                </div>
                                <div className="flex items-end gap-3 flex-wrap">
                                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => approveProduct(p.id)} disabled={saving} data-testid={`confirm-approve-${p.id}`}>
                                    {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />} Approve with Engine Price
                                  </Button>
                                  <div className="flex items-end gap-2">
                                    <div>
                                      <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Override Price (TZS)</label>
                                      <Input type="number" value={overridePrice} onChange={(e) => setOverridePrice(e.target.value)} placeholder="Optional" className="h-8 w-32 text-xs" data-testid="override-price" />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Override Reason</label>
                                      <Input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Reason" className="h-8 w-40 text-xs" data-testid="override-reason" />
                                    </div>
                                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => approveProduct(p.id, overridePrice)} disabled={saving || !overridePrice} data-testid={`override-approve-${p.id}`}>
                                      Override & Approve
                                    </Button>
                                  </div>
                                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setActionProduct(null); setActionType(null); }}>Cancel</Button>
                                </div>
                              </div>
                            )}
                            {actionType === "reject" && (
                              <div className="flex items-end gap-3">
                                <div className="flex-1">
                                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Rejection Reason *</label>
                                  <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Why is this product being rejected?" className="h-8 text-xs" data-testid="reject-reason" />
                                </div>
                                <Button size="sm" className="bg-red-600 hover:bg-red-700 h-8 text-xs" onClick={() => rejectProduct(p.id)} disabled={saving || !rejectReason} data-testid={`confirm-reject-${p.id}`}>
                                  Confirm Reject
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setActionProduct(null); setActionType(null); }}>Cancel</Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-xs text-slate-400 border-t">{filtered.length} of {stats.total || 0} products</div>
        </div>
      )}

      {/* Flags Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Critical (pricing broken)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Warning (below margin / no engine)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Healthy</span>
      </div>
    </div>
  );
}
