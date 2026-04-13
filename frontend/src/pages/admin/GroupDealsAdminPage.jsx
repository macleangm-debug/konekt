import React, { useEffect, useState, useMemo } from "react";
import { Plus, Package, Clock, Check, X, TrendingUp, Users, AlertTriangle, ArrowRight } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

const fmt = (v) => `TZS ${Number(v || 0).toLocaleString("en-US")}`;

const statusConfig = {
  active: { color: "bg-blue-100 text-blue-700", label: "Active" },
  successful: { color: "bg-green-100 text-green-700", label: "Target Reached" },
  finalized: { color: "bg-emerald-100 text-emerald-700", label: "Finalized" },
  failed: { color: "bg-red-100 text-red-700", label: "Failed" },
  expired: { color: "bg-slate-100 text-slate-500", label: "Expired" },
};

function ProfitCalculator({ form }) {
  const vc = Number(form.vendor_cost || 0);
  const dp = Number(form.discounted_price || 0);
  const op = Number(form.original_price || 0);
  const target = Number(form.display_target || 0);
  const margin = dp - vc;
  const marginPct = dp > 0 ? ((margin / dp) * 100).toFixed(1) : 0;
  const totalMargin = margin * target;
  const discountPct = op > 0 ? (((op - dp) / op) * 100).toFixed(0) : 0;
  const safe = margin > 0 && marginPct >= 5;

  return (
    <div className={`rounded-xl border p-4 space-y-2 ${safe ? "bg-green-50 border-green-200" : margin <= 0 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`} data-testid="profit-calculator">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Live Profit Calculator</div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-slate-500">Vendor Cost:</span> <span className="font-bold">{fmt(vc)}</span></div>
        <div><span className="text-slate-500">Final Price:</span> <span className="font-bold">{fmt(dp)}</span></div>
        <div><span className="text-slate-500">Margin/Unit:</span> <span className="font-bold">{fmt(margin)}</span></div>
        <div><span className="text-slate-500">Margin %:</span> <span className="font-bold">{marginPct}%</span></div>
        <div><span className="text-slate-500">Discount:</span> <span className="font-bold">{discountPct}% off</span></div>
        <div><span className="text-slate-500">Target:</span> <span className="font-bold">{target} units</span></div>
      </div>
      <div className="pt-2 border-t flex justify-between items-center">
        <span className="text-sm font-bold">Total Margin ({target} units):</span>
        <span className="text-lg font-extrabold">{fmt(totalMargin)}</span>
      </div>
      <div className={`text-xs font-bold ${safe ? "text-green-700" : margin <= 0 ? "text-red-700" : "text-amber-700"}`}>
        {margin <= 0 ? "BLOCKED — Price below vendor cost" : marginPct < 5 ? "WARNING — Margin below 5% threshold" : "SAFE — Campaign is profitable"}
      </div>
    </div>
  );
}

export default function GroupDealsAdminPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    product_name: "", description: "", vendor_cost: "", original_price: "", discounted_price: "",
    display_target: "50", vendor_threshold: "30", duration_days: "14", commission_mode: "none", affiliate_share_pct: "0",
  });
  const [creating, setCreating] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  useEffect(() => { loadCampaigns(); }, []);

  const loadCampaigns = async () => {
    try {
      const r = await api.get("/api/admin/group-deals/campaigns");
      setCampaigns(r.data || []);
    } catch { toast.error("Failed to load campaigns"); }
    finally { setLoading(false); }
  };

  const createCampaign = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/api/admin/group-deals/campaigns", form);
      toast.success("Campaign created");
      setShowCreate(false);
      setForm({ product_name: "", description: "", vendor_cost: "", original_price: "", discounted_price: "", display_target: "50", vendor_threshold: "30", duration_days: "14", commission_mode: "none", affiliate_share_pct: "0" });
      loadCampaigns();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to create campaign"); }
    finally { setCreating(false); }
  };

  const finalizeCampaign = async (id) => {
    try {
      const r = await api.post(`/api/admin/group-deals/campaigns/${id}/finalize`);
      toast.success(`${r.data.orders_created} orders created`);
      loadCampaigns();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to finalize"); }
  };

  const cancelCampaign = async (id) => {
    try {
      await api.post(`/api/admin/group-deals/campaigns/${id}/cancel`);
      toast.success("Campaign cancelled");
      loadCampaigns();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to cancel"); }
  };

  const stats = useMemo(() => ({
    active: campaigns.filter(c => c.status === "active").length,
    successful: campaigns.filter(c => c.status === "successful").length,
    total_committed: campaigns.reduce((s, c) => s + (c.current_committed || 0), 0),
  }), [campaigns]);

  return (
    <div className="p-6 space-y-5" data-testid="group-deals-admin">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#20364D]">Group Deal Campaigns</h1>
          <p className="text-sm text-slate-500">Volume-based pricing with demand aggregation</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-[#20364D]" data-testid="create-campaign-btn">
          <Plus className="w-4 h-4 mr-2" /> New Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border p-4"><div className="text-2xl font-extrabold text-blue-600">{stats.active}</div><div className="text-xs text-slate-500">Active Campaigns</div></div>
        <div className="bg-white rounded-xl border p-4"><div className="text-2xl font-extrabold text-green-600">{stats.successful}</div><div className="text-xs text-slate-500">Target Reached</div></div>
        <div className="bg-white rounded-xl border p-4"><div className="text-2xl font-extrabold text-[#20364D]">{stats.total_committed}</div><div className="text-xs text-slate-500">Total Commitments</div></div>
      </div>

      {/* Campaign List */}
      <div className="space-y-3">
        {loading ? <div className="text-slate-500 p-8 text-center">Loading...</div> :
          campaigns.length === 0 ? <div className="text-slate-400 p-8 text-center bg-white rounded-xl border">No campaigns yet. Create your first group deal.</div> :
          campaigns.map((c) => {
            const sc = statusConfig[c.status] || statusConfig.active;
            const progress = c.display_target > 0 ? Math.round((c.current_committed / c.display_target) * 100) : 0;
            const daysLeft = c.deadline ? Math.max(0, Math.ceil((new Date(c.deadline) - new Date()) / 86400000)) : 0;
            return (
              <div key={c.id} className="bg-white rounded-2xl border p-5" data-testid={`campaign-${c.id}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-base font-bold text-[#20364D]">{c.product_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{c.campaign_id} &bull; {c.description?.slice(0, 60) || ""}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={sc.color}>{sc.label}</Badge>
                    {c.status === "active" && <span className="text-xs text-slate-400">{daysLeft}d left</span>}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                  <div><span className="text-slate-400">Price:</span> <span className="font-bold text-[#D4A843]">{fmt(c.discounted_price)}</span> <span className="text-xs text-slate-400 line-through ml-1">{fmt(c.original_price)}</span></div>
                  <div><span className="text-slate-400">Margin:</span> <span className="font-bold">{fmt(c.margin_per_unit)}</span> <span className="text-xs text-slate-400">({c.margin_pct}%)</span></div>
                  <div><span className="text-slate-400">Progress:</span> <span className="font-bold">{c.current_committed}/{c.display_target}</span></div>
                  <div><span className="text-slate-400">Revenue:</span> <span className="font-bold">{fmt(c.current_committed * c.discounted_price)}</span></div>
                </div>
                <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-green-500" : progress >= 60 ? "bg-blue-500" : "bg-amber-400"}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
                <div className="flex gap-2 mt-3">
                  {c.status === "successful" && <Button size="sm" onClick={() => finalizeCampaign(c.id)} className="bg-green-600 hover:bg-green-700" data-testid={`finalize-${c.id}`}><Check className="w-3 h-3 mr-1" /> Finalize Orders</Button>}
                  {(c.status === "active" || c.status === "successful") && <Button size="sm" variant="outline" onClick={() => cancelCampaign(c.id)} className="text-red-600" data-testid={`cancel-${c.id}`}><X className="w-3 h-3 mr-1" /> Cancel</Button>}
                </div>
              </div>
            );
          })
        }
      </div>

      {/* Create Campaign Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Group Deal Campaign</DialogTitle>
            <DialogDescription>Set up a volume-based deal with live profit calculation.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createCampaign} className="space-y-4 pt-2" data-testid="create-campaign-form">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><Label>Product Name *</Label><Input value={form.product_name} onChange={(e) => setForm(p => ({ ...p, product_name: e.target.value }))} required data-testid="input-product-name" /></div>
              <div className="md:col-span-2"><Label>Description</Label><textarea className="w-full border rounded-xl px-3 py-2.5 text-sm min-h-[60px]" value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} data-testid="input-description" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Vendor Cost *</Label><Input type="number" value={form.vendor_cost} onChange={(e) => setForm(p => ({ ...p, vendor_cost: e.target.value }))} required data-testid="input-vendor-cost" /></div>
              <div><Label>Original Price</Label><Input type="number" value={form.original_price} onChange={(e) => setForm(p => ({ ...p, original_price: e.target.value }))} data-testid="input-original-price" /></div>
              <div><Label>Deal Price *</Label><Input type="number" value={form.discounted_price} onChange={(e) => setForm(p => ({ ...p, discounted_price: e.target.value }))} required data-testid="input-deal-price" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Display Target *</Label><Input type="number" value={form.display_target} onChange={(e) => setForm(p => ({ ...p, display_target: e.target.value }))} required data-testid="input-display-target" /></div>
              <div><Label>Vendor Threshold</Label><Input type="number" value={form.vendor_threshold} onChange={(e) => setForm(p => ({ ...p, vendor_threshold: e.target.value }))} data-testid="input-vendor-threshold" /></div>
              <div><Label>Duration (days) *</Label><Input type="number" value={form.duration_days} onChange={(e) => setForm(p => ({ ...p, duration_days: e.target.value }))} required data-testid="input-duration" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Commission Mode</Label>
                <select className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white" value={form.commission_mode} onChange={(e) => setForm(p => ({ ...p, commission_mode: e.target.value }))} data-testid="select-commission-mode">
                  <option value="none">None</option>
                  <option value="reduced_percentage">Reduced %</option>
                  <option value="fixed_bounty">Fixed Bounty</option>
                </select>
              </div>
              {form.commission_mode !== "none" && <div><Label>Affiliate Share %</Label><Input type="number" value={form.affiliate_share_pct} onChange={(e) => setForm(p => ({ ...p, affiliate_share_pct: e.target.value }))} data-testid="input-affiliate-share" /></div>}
            </div>

            <ProfitCalculator form={form} />

            <div className="flex gap-3 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={creating} className="flex-1 bg-[#20364D]" data-testid="submit-campaign-btn">{creating ? "Creating..." : "Create Campaign"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
