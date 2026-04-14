import React, { useEffect, useState, useCallback } from "react";
import { Tag, Copy, CheckCircle, Loader2, AlertCircle, Share2, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import api from "../../lib/api";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default function SalesPromoStudio() {
  const [promoCode, setPromoCode] = useState("");
  const [hasCode, setHasCode] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [groupDeals, setGroupDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [codeInput, setCodeInput] = useState("");
  const [codeAvailable, setCodeAvailable] = useState(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [codeRes, campRes] = await Promise.all([
        api.get("/api/sales-promo/my-code").catch(() => ({ data: {} })),
        api.get("/api/sales-promo/campaigns").catch(() => ({ data: { campaigns: [], has_code: false } })),
      ]);
      setPromoCode(codeRes.data?.promo_code || "");
      setHasCode(codeRes.data?.has_code || false);
      setCampaigns(campRes.data?.campaigns || []);
      setGroupDeals(campRes.data?.group_deals || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const validateCode = useCallback(async (code) => {
    if (!code || code.length < 3) { setCodeAvailable(null); return; }
    setCheckingCode(true);
    try {
      const res = await api.get(`/api/sales-promo/validate-code/${code}`);
      setCodeAvailable(res.data.available);
    } catch { setCodeAvailable(null); }
    setCheckingCode(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (codeInput.length >= 3) validateCode(codeInput.toUpperCase());
    }, 500);
    return () => clearTimeout(timer);
  }, [codeInput, validateCode]);

  const saveCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code || code.length < 3 || codeAvailable === false) return;
    setSaving(true);
    try {
      await api.post("/api/sales-promo/create-code", { code });
      toast.success("Promo code created!");
      setPromoCode(code);
      setHasCode(true);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    }
    setSaving(false);
  };

  const copy = (text, id) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    toast.success("Copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return <div className="bg-white border rounded-xl p-5 flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>;
  }

  if (!hasCode) {
    return (
      <div className="bg-white border rounded-xl p-5" data-testid="sales-promo-setup">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-4 h-4 text-[#D4A843]" />
          <h2 className="text-base font-bold text-[#20364D]">Set Up Your Promo Code</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">Create your personal promo code to activate content sharing and earn commissions on referrals.</p>
        <div className="max-w-sm">
          <Label className="text-xs font-semibold">Your Promo Code</Label>
          <div className="relative mt-1">
            <Input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
              placeholder="e.g., SARAH2024"
              className="pr-10 font-mono text-lg tracking-wider"
              maxLength={20}
              data-testid="sales-code-input"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {checkingCode && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
              {!checkingCode && codeAvailable === true && <CheckCircle className="w-4 h-4 text-emerald-500" />}
              {!checkingCode && codeAvailable === false && <AlertCircle className="w-4 h-4 text-red-500" />}
            </div>
          </div>
          {codeAvailable === false && <p className="text-[10px] text-red-500 mt-1">Already taken</p>}
          {codeAvailable === true && <p className="text-[10px] text-emerald-500 mt-1">Available</p>}
          <Button onClick={saveCode} disabled={saving || codeAvailable === false || codeInput.length < 3} className="mt-3 bg-[#20364D] hover:bg-[#1a2d40]" data-testid="save-sales-code">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Create Code & Activate Sharing
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl p-5" data-testid="sales-content-studio">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#D4A843]" />
          <h2 className="text-base font-bold text-[#20364D]">Content Studio</h2>
          <span className="text-xs text-slate-400">({campaigns.length + groupDeals.length} items)</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg">
          <span className="text-[10px] font-semibold text-slate-400 uppercase">Your Code</span>
          <span className="font-bold text-[#D4A843] text-sm font-mono">{promoCode}</span>
          <button onClick={() => copy(promoCode, "my-code")} className="p-1 rounded hover:bg-slate-200 transition" data-testid="copy-my-code">
            {copiedId === "my-code" ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
          </button>
        </div>
      </div>

      {campaigns.length === 0 && groupDeals.length === 0 ? (
        <div className="text-center py-6 text-slate-400">
          <Share2 className="w-6 h-6 mx-auto mb-2" />
          <p className="text-sm">No products available to share yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupDeals.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#D4A843] uppercase tracking-wide mb-2">Group Deals</p>
              <div className="grid md:grid-cols-2 gap-3">
                {groupDeals.slice(0, 6).map((c) => <SalesCampaignCard key={c.id} c={c} copy={copy} copiedId={copiedId} />)}
              </div>
            </div>
          )}
          {campaigns.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Products</p>
              <div className="grid md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                {campaigns.slice(0, 12).map((c) => <SalesCampaignCard key={c.id} c={c} copy={copy} copiedId={copiedId} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SalesCampaignCard({ c, copy, copiedId }) {
  return (
    <div className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition" data-testid={`sales-campaign-${c.id}`}>
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400 flex-shrink-0 overflow-hidden">
          {c.image_url ? <img src={c.image_url} alt="" className="w-full h-full object-cover rounded-lg" /> : (c.name || "?")[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#20364D] truncate">{c.name}</p>
          <p className="text-xs text-slate-500">{money(c.selling_price)}</p>
          {c.savings > 0 && <p className="text-[10px] font-semibold text-red-500">Save TZS {c.savings.toLocaleString()}</p>}
          {c.your_earning > 0 && <p className="text-[10px] text-emerald-600 font-semibold">You earn {money(c.your_earning)}</p>}
          {c.type === "group_deal" && c.current_committed > 0 && (
            <p className="text-[10px] text-blue-500 font-medium">{c.current_committed}/{c.target} units</p>
          )}
        </div>
      </div>
      <div className="flex gap-1.5 mt-2">
        <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => copy(c.caption, `cap-${c.id}`)}>
          {copiedId === `cap-${c.id}` ? <CheckCircle className="w-3 h-3 mr-1 text-green-500" /> : <Copy className="w-3 h-3 mr-1" />} Caption
        </Button>
        <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => copy(c.product_link, `lnk-${c.id}`)}>
          {copiedId === `lnk-${c.id}` ? <CheckCircle className="w-3 h-3 mr-1 text-green-500" /> : <Copy className="w-3 h-3 mr-1" />} Link
        </Button>
        <Button size="sm" className="flex-1 text-xs h-7 bg-[#D4A843] hover:bg-[#c09a38] text-white" onClick={() => copy(c.caption, `qs-${c.id}`)}>
          <Share2 className="w-3 h-3 mr-1" /> Quick Share
        </Button>
      </div>
    </div>
  );
}
