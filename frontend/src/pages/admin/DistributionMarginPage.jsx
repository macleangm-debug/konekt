import React, { useState, useEffect, useCallback } from "react";
import { Settings2, Users, DollarSign, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import api from "../../lib/api";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function DistributionMarginPage() {
  const [settings, setSettings] = useState({
    konekt_margin_pct: 20,
    distribution_margin_pct: 10,
    affiliate_pct: 4,
    sales_pct: 3,
    discount_pct: 3,
    attribution_window_days: 365,
    minimum_payout: 50000,
  });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get("/api/admin/distribution-margin/settings");
      if (res.data?.settings) {
        setSettings((prev) => ({ ...prev, ...res.data.settings }));
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  };

  const setField = (key, value) => {
    const numVal = key === "attribution_window_days" || key === "minimum_payout"
      ? parseInt(value) || 0
      : parseFloat(value) || 0;
    setSettings((prev) => ({ ...prev, [key]: numVal }));
  };

  const totalSplit = (settings.affiliate_pct || 0) + (settings.sales_pct || 0) + (settings.discount_pct || 0);
  const isValid = totalSplit <= settings.distribution_margin_pct;
  const remaining = Math.max(0, settings.distribution_margin_pct - totalSplit);

  const handleSave = async () => {
    if (!isValid) {
      toast.error("Distribution split exceeds the distribution margin. Adjust the percentages.");
      return;
    }
    setSaving(true);
    try {
      const res = await api.put("/api/admin/distribution-margin/settings", settings);
      if (res.data?.ok) {
        toast.success("Distribution settings saved successfully");
      } else {
        toast.error(res.data?.error || "Failed to save settings");
      }
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    try {
      const res = await api.post("/api/admin/distribution-margin/preview", {
        vendor_price_tax_inclusive: 10000,
        konekt_margin_pct: settings.konekt_margin_pct,
        distribution_margin_pct: settings.distribution_margin_pct,
        affiliate_pct: settings.affiliate_pct,
        sales_pct: settings.sales_pct,
        discount_pct: settings.discount_pct,
      });
      setPreview(res.data);
    } catch {
      toast.error("Preview failed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="distribution-margin-page">
      <div>
        <h1 className="text-2xl font-bold text-[#20364D]">Affiliate & Margin Management</h1>
        <p className="mt-1 text-sm text-slate-600">
          Configure the distribution layer and affiliate settings. Konekt margin is fixed and untouchable.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fixed Margin */}
        <div className="rounded-2xl border bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-[#20364D]" />
            <h2 className="text-lg font-semibold text-[#20364D]">Pricing Layers</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Konekt Margin % (Fixed)</label>
              <input
                type="number"
                step="0.1"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-slate-50 text-slate-600"
                value={settings.konekt_margin_pct}
                onChange={(e) => setField("konekt_margin_pct", e.target.value)}
                data-testid="konekt-margin-input"
              />
              <p className="text-xs text-slate-500 mt-1">Applied directly on vendor price. This margin is never reduced.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Distribution Layer % (Flexible)</label>
              <input
                type="number"
                step="0.1"
                className="w-full border border-slate-300 rounded-xl px-4 py-3"
                value={settings.distribution_margin_pct}
                onChange={(e) => setField("distribution_margin_pct", e.target.value)}
                data-testid="distribution-margin-input"
              />
              <p className="text-xs text-slate-500 mt-1">Sits on top of Konekt margin. Funds affiliate, sales, and discounts.</p>
            </div>
          </div>
        </div>

        {/* Distribution Split */}
        <div className="rounded-2xl border bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-[#20364D]" />
            <h2 className="text-lg font-semibold text-[#20364D]">Distribution Split</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Affiliate Commission %</label>
              <input
                type="number"
                step="0.1"
                className="w-full border border-slate-300 rounded-xl px-4 py-3"
                value={settings.affiliate_pct}
                onChange={(e) => setField("affiliate_pct", e.target.value)}
                data-testid="affiliate-pct-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sales Commission %</label>
              <input
                type="number"
                step="0.1"
                className="w-full border border-slate-300 rounded-xl px-4 py-3"
                value={settings.sales_pct}
                onChange={(e) => setField("sales_pct", e.target.value)}
                data-testid="sales-pct-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Customer Discount %</label>
              <input
                type="number"
                step="0.1"
                className="w-full border border-slate-300 rounded-xl px-4 py-3"
                value={settings.discount_pct}
                onChange={(e) => setField("discount_pct", e.target.value)}
                data-testid="discount-pct-input"
              />
            </div>

            {/* Validation bar */}
            <div className={`rounded-xl border p-4 ${isValid ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`} data-testid="split-validation">
              <div className="flex items-center gap-2 mb-2">
                {isValid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-semibold ${isValid ? "text-emerald-700" : "text-red-700"}`}>
                  {isValid ? "Valid Split" : "Over-allocated"}
                </span>
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Affiliate + Sales + Discount</span>
                  <span className="font-mono font-semibold">{totalSplit.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Distribution Cap</span>
                  <span className="font-mono font-semibold">{settings.distribution_margin_pct}%</span>
                </div>
                {isValid && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Remaining (Konekt keeps)</span>
                    <span className="font-mono font-semibold">{remaining.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Affiliate Settings */}
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-5 h-5 text-[#20364D]" />
          <h2 className="text-lg font-semibold text-[#20364D]">Affiliate Program Settings</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Attribution Window (days)</label>
            <input
              type="number"
              className="w-full border border-slate-300 rounded-xl px-4 py-3"
              value={settings.attribution_window_days}
              onChange={(e) => setField("attribution_window_days", e.target.value)}
              data-testid="attribution-window-input"
            />
            <p className="text-xs text-slate-500 mt-1">How long a referral cookie remains active</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Minimum Payout (TZS)</label>
            <input
              type="number"
              className="w-full border border-slate-300 rounded-xl px-4 py-3"
              value={settings.minimum_payout}
              onChange={(e) => setField("minimum_payout", e.target.value)}
              data-testid="minimum-payout-input"
            />
            <p className="text-xs text-slate-500 mt-1">Minimum balance before affiliate payout is triggered</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !isValid}
          className="rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold hover:bg-[#2a4a66] transition disabled:opacity-50"
          data-testid="save-settings-btn"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        <button
          onClick={handlePreview}
          className="rounded-xl border border-[#20364D] text-[#20364D] px-6 py-3 font-semibold hover:bg-[#20364D] hover:text-white transition"
          data-testid="preview-btn"
        >
          Preview (TZS 10,000 vendor price)
        </button>
      </div>

      {/* Preview Result */}
      {preview && preview.ok && (
        <div className="rounded-2xl border bg-slate-50 p-6" data-testid="preview-result">
          <h3 className="font-semibold text-[#20364D] mb-4">Price Breakdown (Vendor = TZS 10,000)</h3>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-600">Vendor Price</span>
              <span className="font-semibold">TZS {preview.pricing.vendor_price_tax_inclusive.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-600">+ Konekt Margin ({preview.pricing.konekt_margin_pct}%)</span>
              <span className="font-semibold">TZS {preview.pricing.konekt_margin_value.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-600">+ Distribution ({preview.pricing.distribution_margin_pct}%)</span>
              <span className="font-semibold">TZS {preview.pricing.distribution_margin_value.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b pb-2 text-[#20364D] font-bold">
              <span>= Final Price</span>
              <span>TZS {preview.pricing.final_price.toLocaleString()}</span>
            </div>
            <div className="sm:col-span-2 border-t pt-3 mt-1 text-xs text-slate-500">
              <div className="flex justify-between"><span>Affiliate Commission</span><span>TZS {preview.components.affiliate_commission.toLocaleString()}</span></div>
              <div className="flex justify-between mt-1"><span>Sales Commission</span><span>TZS {preview.components.sales_commission.toLocaleString()}</span></div>
              <div className="flex justify-between mt-1"><span>Customer Discount</span><span>TZS {preview.components.customer_discount.toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
