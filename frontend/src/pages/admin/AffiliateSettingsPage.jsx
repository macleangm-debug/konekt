import React, { useEffect, useState } from "react";
import { Settings, Percent, Gift, Users, Shield, DollarSign } from "lucide-react";
import api from "../../lib/api";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import CurrentPromotionsWidget from "../../components/admin/CurrentPromotionsWidget";

export default function AffiliateSettingsPage() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get("/api/admin/affiliate-settings");
      setForm(res.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load affiliate settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      await api.put("/api/admin/affiliate-settings", form);
      toast.success("Affiliate settings saved successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10">Loading settings...</div>;
  if (!form) return <div className="p-10">Failed to load settings</div>;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="affiliate-settings-page">
      <CurrentPromotionsWidget />

      <div className="text-left">
        <h1 className="text-4xl font-bold text-[#2D3E50]">Affiliate Settings</h1>
        <p className="mt-2 text-slate-600">
          Configure commission rules, tracking, qualification, and payout policy.
        </p>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="rounded-3xl border bg-white p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2D3E50]/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-[#2D3E50]" />
            </div>
            <h2 className="text-2xl font-bold">General</h2>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <span>Enable affiliate program</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.application_enabled}
              onChange={(e) => setForm({ ...form, application_enabled: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <span>Enable affiliate applications</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.auto_approve}
              onChange={(e) => setForm({ ...form, auto_approve: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <span>Auto-approve applications</span>
          </label>

          <textarea
            className="w-full border rounded-xl px-4 py-3 min-h-[100px]"
            value={form.branding_message || ""}
            onChange={(e) => setForm({ ...form, branding_message: e.target.value })}
            placeholder="Branding message for affiliate program"
          />
        </div>

        {/* Commission Rules */}
        <div className="rounded-3xl border bg-white p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Percent className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold">Commission Rules</h2>
          </div>

          <div>
            <label className="text-sm text-slate-500">Commission Type</label>
            <select
              className="w-full border rounded-xl px-4 py-3 mt-1"
              value={form.commission_type || "percentage"}
              onChange={(e) => setForm({ ...form, commission_type: e.target.value })}
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-500">Default Commission Rate (%)</label>
            <input
              className="w-full border rounded-xl px-4 py-3 mt-1"
              type="number"
              value={form.default_commission_rate || ""}
              onChange={(e) => setForm({ ...form, default_commission_rate: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm text-slate-500">Default Fixed Commission (TZS)</label>
            <input
              className="w-full border rounded-xl px-4 py-3 mt-1"
              type="number"
              value={form.default_fixed_commission || ""}
              onChange={(e) => setForm({ ...form, default_fixed_commission: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm text-slate-500">Commission Trigger</label>
            <select
              className="w-full border rounded-xl px-4 py-3 mt-1"
              value={form.commission_trigger || "business_closed_paid"}
              onChange={(e) => setForm({ ...form, commission_trigger: e.target.value })}
            >
              <option value="business_closed_paid">Business Closed & Paid</option>
              <option value="invoice_paid">Invoice Paid</option>
              <option value="order_paid">Order Paid</option>
            </select>
          </div>
        </div>

        {/* Tracking Settings */}
        <div className="rounded-3xl border bg-white p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold">Tracking</h2>
          </div>

          <div>
            <label className="text-sm text-slate-500">Cookie Window (days)</label>
            <input
              className="w-full border rounded-xl px-4 py-3 mt-1"
              type="number"
              value={form.cookie_window_days || ""}
              onChange={(e) => setForm({ ...form, cookie_window_days: e.target.value })}
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.allow_promo_codes}
              onChange={(e) => setForm({ ...form, allow_promo_codes: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <span>Allow promo codes</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.allow_referral_links}
              onChange={(e) => setForm({ ...form, allow_referral_links: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <span>Allow referral links</span>
          </label>
        </div>

        {/* Payout & Qualification */}
        <div className="rounded-3xl border bg-white p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold">Payout & Qualification</h2>
          </div>

          <div>
            <label className="text-sm text-slate-500">Minimum Payout Amount (TZS)</label>
            <input
              className="w-full border rounded-xl px-4 py-3 mt-1"
              type="number"
              value={form.minimum_payout_amount || ""}
              onChange={(e) => setForm({ ...form, minimum_payout_amount: e.target.value })}
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.require_manual_payout_approval}
              onChange={(e) => setForm({ ...form, require_manual_payout_approval: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <span>Require manual payout approval</span>
          </label>

          <div>
            <label className="text-sm text-slate-500">Partner Terms URL</label>
            <input
              className="w-full border rounded-xl px-4 py-3 mt-1"
              value={form.partner_terms_url || ""}
              onChange={(e) => setForm({ ...form, partner_terms_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.qualification_rules?.require_review}
              onChange={(e) =>
                setForm({
                  ...form,
                  qualification_rules: {
                    ...form.qualification_rules,
                    require_review: e.target.checked,
                  },
                })
              }
              className="w-5 h-5 rounded"
            />
            <span>Require manual review</span>
          </label>
        </div>

        {/* Customer Perk Settings */}
        <div className="rounded-3xl border bg-white p-6 space-y-4 xl:col-span-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Gift className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold">Customer Perk</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 cursor-pointer md:col-span-2">
              <input
                type="checkbox"
                checked={!!form.customer_perk_enabled}
                onChange={(e) => setForm({ ...form, customer_perk_enabled: e.target.checked })}
                className="w-5 h-5 rounded"
              />
              <span>Enable customer perk for affiliate code users</span>
            </label>

            <div>
              <label className="text-sm text-slate-500">Perk Type</label>
              <select
                className="w-full border rounded-xl px-4 py-3 mt-1"
                value={form.customer_perk_type || "percentage_discount"}
                onChange={(e) => setForm({ ...form, customer_perk_type: e.target.value })}
              >
                <option value="percentage_discount">Percentage Discount</option>
                <option value="fixed_discount">Fixed Discount</option>
                <option value="free_addon">Free Add-on</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-500">Perk Value</label>
              <input
                className="w-full border rounded-xl px-4 py-3 mt-1"
                type="number"
                value={form.customer_perk_value || ""}
                onChange={(e) => setForm({ ...form, customer_perk_value: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm text-slate-500">Discount Cap (TZS)</label>
              <input
                className="w-full border rounded-xl px-4 py-3 mt-1"
                type="number"
                value={form.customer_perk_cap || ""}
                onChange={(e) => setForm({ ...form, customer_perk_cap: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm text-slate-500">Minimum Order Amount (TZS)</label>
              <input
                className="w-full border rounded-xl px-4 py-3 mt-1"
                type="number"
                value={form.customer_perk_min_order_amount || ""}
                onChange={(e) => setForm({ ...form, customer_perk_min_order_amount: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm text-slate-500">Allowed Categories (comma separated)</label>
              <input
                className="w-full border rounded-xl px-4 py-3 mt-1"
                value={(form.customer_perk_allowed_categories || []).join(", ")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    customer_perk_allowed_categories: e.target.value
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="creative, promotional_materials"
              />
            </div>

            <div>
              <label className="text-sm text-slate-500">Free Add-on Code</label>
              <input
                className="w-full border rounded-xl px-4 py-3 mt-1"
                value={form.customer_perk_free_addon_code || ""}
                onChange={(e) => setForm({ ...form, customer_perk_free_addon_code: e.target.value })}
                placeholder="e.g., free_copywriting"
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.customer_perk_first_order_only}
                  onChange={(e) => setForm({ ...form, customer_perk_first_order_only: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <span>First paid order only</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.customer_perk_stackable}
                  onChange={(e) => setForm({ ...form, customer_perk_stackable: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <span>Allow stacking with other promos</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <Button
        onClick={save}
        disabled={saving}
        className="bg-[#2D3E50] hover:bg-[#1e2d3d]"
        data-testid="save-settings-btn"
      >
        {saving ? "Saving..." : "Save Affiliate Settings"}
      </Button>
    </div>
  );
}
