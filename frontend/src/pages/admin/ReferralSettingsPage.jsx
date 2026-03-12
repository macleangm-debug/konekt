import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Gift, Save, Loader2, Settings, DollarSign, MessageSquare,
  ToggleLeft, ToggleRight, Percent, Hash, Coins
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { toast } from "sonner";
import { adminApi } from "../../lib/adminApi";

const initialForm = {
  enabled: true,
  reward_type: "points",
  reward_mode: "points_per_amount",
  trigger_event: "every_paid_order",
  points_per_amount: 1,
  amount_unit: 1000,
  fixed_points: 0,
  minimum_order_amount: 0,
  max_points_per_order: 5000,
  max_points_per_referred_customer: 20000,
  redemption_enabled: true,
  point_value_points: 100,
  point_value_amount: 5000,
  minimum_redeem_points: 100,
  max_redeem_percent_per_order: 50,
  share_message: "I use Konekt for branded products and design services. Join using my link: {referral_link}",
  whatsapp_message: "I use Konekt for branded products and design services. Join using my link: {referral_link}",
};

export default function ReferralSettingsPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminApi.getReferralSettings();
        setForm({ ...initialForm, ...res.data });
      } catch (error) {
        console.error(error);
        toast.error("Failed to load referral settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.updateReferralSettings(form);
      toast.success("Referral settings saved");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="referral-settings-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">Referral Settings</h1>
        <p className="text-muted-foreground">Configure your referral program rewards and rules</p>
      </div>

      <form onSubmit={save} className="space-y-6">
        {/* Program Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-100 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Gift className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">Program Status</h2>
              <p className="text-sm text-muted-foreground">Enable or disable the referral program</p>
            </div>
          </div>

          <label className="flex items-center gap-4 cursor-pointer">
            <Switch
              checked={form.enabled}
              onCheckedChange={(checked) => update("enabled", checked)}
            />
            <div>
              <span className="font-medium">{form.enabled ? "Program Enabled" : "Program Disabled"}</span>
              <p className="text-sm text-muted-foreground">
                {form.enabled ? "Customers can refer friends and earn rewards" : "Referral program is currently paused"}
              </p>
            </div>
          </label>
        </motion.div>

        {/* Reward Rules */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-100 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#D4A843]/10 rounded-xl flex items-center justify-center">
              <Coins className="w-5 h-5 text-[#D4A843]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">Reward Rules</h2>
              <p className="text-sm text-muted-foreground">Configure how referrers earn points</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label>Reward Mode</Label>
              <Select value={form.reward_mode} onValueChange={(v) => update("reward_mode", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="points_per_amount">Points per Amount</SelectItem>
                  <SelectItem value="fixed_points">Fixed Points</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Trigger Event</Label>
              <Select value={form.trigger_event} onValueChange={(v) => update("trigger_event", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="every_paid_order">Every Paid Order</SelectItem>
                  <SelectItem value="first_paid_order">First Paid Order Only</SelectItem>
                  <SelectItem value="delivered_order">Delivered Order Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Minimum Order Amount</Label>
              <Input
                type="number"
                value={form.minimum_order_amount}
                onChange={(e) => update("minimum_order_amount", Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>

          {form.reward_mode === "points_per_amount" ? (
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Points per Amount</Label>
                  <Input
                    type="number"
                    value={form.points_per_amount}
                    onChange={(e) => update("points_per_amount", Number(e.target.value))}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Points earned per unit amount</p>
                </div>
                <div>
                  <Label>Amount Unit (TZS)</Label>
                  <Input
                    type="number"
                    value={form.amount_unit}
                    onChange={(e) => update("amount_unit", Number(e.target.value))}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Example: {form.points_per_amount} point(s) per TZS {form.amount_unit.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-4">
              <div>
                <Label>Fixed Points per Referral</Label>
                <Input
                  type="number"
                  value={form.fixed_points}
                  onChange={(e) => update("fixed_points", Number(e.target.value))}
                  className="mt-1 max-w-xs"
                />
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label>Max Points per Order</Label>
              <Input
                type="number"
                value={form.max_points_per_order}
                onChange={(e) => update("max_points_per_order", Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Max Points per Referred Customer</Label>
              <Input
                type="number"
                value={form.max_points_per_referred_customer}
                onChange={(e) => update("max_points_per_referred_customer", Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
        </motion.div>

        {/* Points Redemption */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-100 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">Points Redemption</h2>
              <p className="text-sm text-muted-foreground">Configure how customers can use their points</p>
            </div>
          </div>

          <label className="flex items-center gap-4 cursor-pointer mb-6">
            <Switch
              checked={form.redemption_enabled}
              onCheckedChange={(checked) => update("redemption_enabled", checked)}
            />
            <div>
              <span className="font-medium">{form.redemption_enabled ? "Redemption Enabled" : "Redemption Disabled"}</span>
              <p className="text-sm text-muted-foreground">
                Allow customers to redeem points at checkout
              </p>
            </div>
          </label>

          {form.redemption_enabled && (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Points Value (Points)</Label>
                <Input
                  type="number"
                  value={form.point_value_points}
                  onChange={(e) => update("point_value_points", Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Points Value (TZS)</Label>
                <Input
                  type="number"
                  value={form.point_value_amount}
                  onChange={(e) => update("point_value_amount", Number(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {form.point_value_points} points = TZS {form.point_value_amount.toLocaleString()}
                </p>
              </div>
              <div>
                <Label>Minimum Redeem Points</Label>
                <Input
                  type="number"
                  value={form.minimum_redeem_points}
                  onChange={(e) => update("minimum_redeem_points", Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Max Redeem % per Order</Label>
                <Input
                  type="number"
                  value={form.max_redeem_percent_per_order}
                  onChange={(e) => update("max_redeem_percent_per_order", Number(e.target.value))}
                  className="mt-1"
                  max={100}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Share Messages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-100 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">Share Messages</h2>
              <p className="text-sm text-muted-foreground">Customize the default referral share messages</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Default Share Message</Label>
              <Textarea
                value={form.share_message}
                onChange={(e) => update("share_message", e.target.value)}
                className="mt-1 min-h-[100px]"
                placeholder="Use {referral_link} as placeholder for the referral link"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use <code className="bg-slate-100 px-1 rounded">{"{referral_link}"}</code> as placeholder for the customer's unique referral link
              </p>
            </div>

            <div>
              <Label>WhatsApp Share Message</Label>
              <Textarea
                value={form.whatsapp_message}
                onChange={(e) => update("whatsapp_message", e.target.value)}
                className="mt-1 min-h-[100px]"
                placeholder="Use {referral_link} as placeholder for the referral link"
              />
            </div>
          </div>
        </motion.div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="min-w-[200px]">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
