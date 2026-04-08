import React, { useState, useEffect, useCallback } from "react";
import { Settings2, Users, DollarSign, AlertTriangle, CheckCircle2, RefreshCw, Plus, Trash2, Layers } from "lucide-react";
import api from "../../lib/api";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SCOPE_LABELS = {
  global: "Global Default",
  product_group: "Product Group",
  product: "Individual Product",
  service_group: "Service Group",
  service: "Individual Service",
};

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
  const [marginRules, setMarginRules] = useState([]);
  const [newRule, setNewRule] = useState({
    scope_type: "group",
    scope_id: "",
    scope_label: "",
    operational_margin_pct: 20,
    distributable_margin_pct: 10,
  });

  useEffect(() => {
    loadSettings();
    loadMarginRules();
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

  const loadMarginRules = async () => {
    try {
      const res = await api.get("/api/admin/margin-rules");
      if (Array.isArray(res.data)) setMarginRules(res.data);
      else if (res.data?.rules) setMarginRules(res.data.rules);
    } catch {}
  };

  const handleAddRule = async () => {
    if (!newRule.scope_label.trim()) {
      toast.error("Please provide a label for this rule");
      return;
    }
    if (newRule.distributable_margin_pct > newRule.operational_margin_pct) {
      toast.error("Distributable cannot exceed operational margin");
      return;
    }
    try {
      const scopeMap = { product_group: "group", service_group: "group" };
      const payload = {
        scope: scopeMap[newRule.scope_type] || newRule.scope_type,
        target_id: newRule.scope_id.trim() || newRule.scope_label.trim().toLowerCase().replace(/\s+/g, "-"),
        target_name: newRule.scope_label,
        method: "percentage",
        value: newRule.operational_margin_pct,
        distributable_margin_pct: newRule.distributable_margin_pct,
      };
      const res = await api.post("/api/admin/margin-rules", payload);
      if (res.data?.id) {
        toast.success("Margin rule saved");
        loadMarginRules();
        setNewRule({ scope_type: "group", scope_id: "", scope_label: "", operational_margin_pct: 20, distributable_margin_pct: 10 });
      } else {
        toast.error(res.data?.detail || "Failed to save rule");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save rule");
    }
  };

  const handleDeleteRule = async (rule) => {
    try {
      await api.delete(`/api/admin/margin-rules/${rule.id}`);
      toast.success("Rule removed");
      loadMarginRules();
    } catch {
      toast.error("Failed to delete rule");
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

      <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
        <strong>Fixed Margin</strong> = applied directly on vendor price and never exposed to customers.
        <strong className="ml-1">Flexible Distribution</strong> = sits on top, funds affiliates, sales, and discounts.
        Customer-facing pricing never shows internal margin breakdown.
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
                  {isValid ? "Valid Split" : "Over-allocated — reduce percentages to save"}
                </span>
              </div>
              {!isValid && (
                <p className="text-xs text-red-600 mb-2">
                  Total split ({totalSplit.toFixed(1)}%) exceeds the distribution cap ({settings.distribution_margin_pct}%). Reduce affiliate, sales, or discount percentages.
                </p>
              )}
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

      {/* Margin Override Rules */}
      <div className="rounded-2xl border bg-white p-6" data-testid="margin-rules-section">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="w-5 h-5 text-[#20364D]" />
          <h2 className="text-lg font-semibold text-[#20364D]">Margin Override Rules</h2>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Override the global margin for specific product groups, products, or services. The most specific rule wins: Product &gt; Group &gt; Global.
        </p>

        {/* Existing rules */}
        {marginRules.length > 0 && (
          <div className="border rounded-xl overflow-hidden mb-5">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium text-slate-600">Scope</th>
                  <th className="px-4 py-2.5 font-medium text-slate-600">Label</th>
                  <th className="px-4 py-2.5 font-medium text-slate-600 text-right">Margin %</th>
                  <th className="px-4 py-2.5 font-medium text-slate-600 text-right">Distributable %</th>
                  <th className="px-4 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {marginRules.map((rule, i) => (
                  <tr key={rule.id || i} className="border-t" data-testid={`margin-rule-row-${i}`}>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                        {rule.scope === "group" ? "Group" : rule.scope === "product" ? "Product" : "Global"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium">{rule.target_name || rule.scope_label || "—"}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{rule.value || rule.operational_margin_pct}%</td>
                    <td className="px-4 py-2.5 text-right font-mono">{rule.distributable_margin_pct || "—"}%</td>
                    <td className="px-4 py-2.5">
                      {rule.scope !== "global" && (
                        <button
                          onClick={() => handleDeleteRule(rule)}
                          className="text-red-400 hover:text-red-600 transition"
                          data-testid={`delete-rule-${i}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add new rule form */}
        <div className="rounded-xl border border-dashed border-slate-300 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Add Override Rule</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <select
              value={newRule.scope_type}
              onChange={(e) => setNewRule((p) => ({ ...p, scope_type: e.target.value }))}
              className="border rounded-xl px-3 py-2.5 text-sm"
              data-testid="new-rule-scope-type"
            >
              <option value="group">Product / Service Group</option>
              <option value="product">Individual Product</option>
            </select>
            <input
              placeholder="Label (e.g. Office Equipment)"
              value={newRule.scope_label}
              onChange={(e) => setNewRule((p) => ({ ...p, scope_label: e.target.value }))}
              className="border rounded-xl px-3 py-2.5 text-sm"
              data-testid="new-rule-label"
            />
            <input
              type="number"
              step="0.1"
              placeholder="Margin %"
              value={newRule.operational_margin_pct}
              onChange={(e) => setNewRule((p) => ({ ...p, operational_margin_pct: parseFloat(e.target.value) || 0 }))}
              className="border rounded-xl px-3 py-2.5 text-sm"
              data-testid="new-rule-margin"
            />
            <input
              type="number"
              step="0.1"
              placeholder="Distributable %"
              value={newRule.distributable_margin_pct}
              onChange={(e) => setNewRule((p) => ({ ...p, distributable_margin_pct: parseFloat(e.target.value) || 0 }))}
              className="border rounded-xl px-3 py-2.5 text-sm"
              data-testid="new-rule-distributable"
            />
            <button
              onClick={handleAddRule}
              className="rounded-xl bg-[#20364D] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#2a4a66] transition flex items-center justify-center gap-1"
              data-testid="add-rule-btn"
            >
              <Plus className="w-4 h-4" /> Add Rule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
