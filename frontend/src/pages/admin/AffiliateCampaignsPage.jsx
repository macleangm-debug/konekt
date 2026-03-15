import React, { useEffect, useState } from "react";
import { Megaphone, Copy, Plus, Calendar, Target, Gift, X, Loader2, Check } from "lucide-react";
import api from "../../lib/api";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import CurrentPromotionsWidget from "../../components/admin/CurrentPromotionsWidget";
import CampaignPerformanceWidget from "../../components/admin/CampaignPerformanceWidget";

const initialForm = {
  name: "",
  slug: "",
  description: "",
  headline: "",
  is_active: true,
  channel: "affiliate",
  start_date: "",
  end_date: "",
  eligibility: {
    requires_affiliate_code: true,
    specific_affiliate_codes: [],
    first_order_only: false,
    min_order_amount: 0,
    allowed_categories: [],
    allowed_service_slugs: [],
  },
  reward: {
    type: "percentage_discount",
    value: 0,
    cap: 0,
    free_addon_code: "",
  },
  limits: {
    max_uses_per_customer: 1,
    max_total_redemptions: 0,
  },
  stacking: {
    allow_with_points: false,
    allow_with_other_promos: false,
    allow_with_referral_rewards: false,
  },
  affiliate_commission: {
    mode: "default",
    override_rate: 0,
  },
  marketing: {
    promo_code: "",
    landing_url: "",
    cta: "",
    hashtags: [],
  },
};

export default function AffiliateCampaignsPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [selectedMessages, setSelectedMessages] = useState(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/admin/affiliate-campaigns");
      setItems(res.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createCampaign = async () => {
    try {
      setCreating(true);
      await api.post("/api/admin/affiliate-campaigns", form);
      toast.success("Campaign created successfully");
      setForm(initialForm);
      setShowForm(false);
      load();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to create campaign");
    } finally {
      setCreating(false);
    }
  };

  const loadMessages = async (id) => {
    try {
      const res = await api.get(`/api/admin/campaign-marketing/${id}/messages`);
      setSelectedMessages(res.data);
      setSelectedCampaignId(id);
    } catch (error) {
      toast.error("Failed to load messages");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getCampaignStatus = (campaign) => {
    const now = new Date();
    const start = new Date(campaign.start_date);
    const end = new Date(campaign.end_date);
    
    if (!campaign.is_active) return { label: "Inactive", color: "bg-slate-100 text-slate-600" };
    if (now < start) return { label: "Upcoming", color: "bg-blue-100 text-blue-700" };
    if (now > end) return { label: "Expired", color: "bg-red-100 text-red-600" };
    return { label: "Active", color: "bg-emerald-100 text-emerald-700" };
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="affiliate-campaigns-page">
      <CurrentPromotionsWidget />
      <CampaignPerformanceWidget />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-[#2D3E50]">Promotion Campaigns</h1>
          <p className="mt-2 text-slate-600">
            Create and manage affiliate/public promotions with social share messages.
          </p>
        </div>
        
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#2D3E50] hover:bg-[#1e2d3d]"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      <div className="grid xl:grid-cols-[1fr_480px] gap-6">
        {/* Campaign List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border bg-white p-10 text-center">
              <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No campaigns yet</p>
              <p className="text-sm text-slate-400 mt-2">Create your first promotion campaign</p>
            </div>
          ) : (
            items.map((item) => {
              const status = getCampaignStatus(item);
              return (
                <div key={item.id} className="rounded-3xl border bg-white p-6" data-testid={`campaign-card-${item.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xl font-bold text-[#2D3E50]">{item.name}</div>
                      <div className="text-slate-500 mt-1 capitalize">{item.channel} channel</div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  {item.headline && (
                    <div className="mt-3 text-lg font-medium text-[#2D3E50]">{item.headline}</div>
                  )}
                  
                  {item.description && (
                    <div className="text-slate-600 mt-2">{item.description}</div>
                  )}

                  <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
                    </div>
                    {item.reward?.type && (
                      <div className="flex items-center gap-1">
                        <Gift className="w-4 h-4" />
                        {item.reward.type === "percentage_discount" && `${item.reward.value}% off`}
                        {item.reward.type === "fixed_discount" && `TZS ${Number(item.reward.value || 0).toLocaleString()} off`}
                        {item.reward.type === "free_addon" && `Free ${item.reward.free_addon_code || "add-on"}`}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-5">
                    <Button
                      onClick={() => loadMessages(item.id)}
                      variant={selectedCampaignId === item.id ? "default" : "outline"}
                      className={selectedCampaignId === item.id ? "bg-[#2D3E50]" : ""}
                    >
                      <Megaphone className="w-4 h-4 mr-2" />
                      Share Messages
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Panel - Form or Messages */}
        <div className="space-y-6">
          {/* Create Campaign Form */}
          {showForm && (
            <div className="rounded-3xl border bg-white p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Create Campaign</h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Campaign name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Slug (e.g., spring-promo)"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Headline (short catchy text)"
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
              />
              <textarea
                className="w-full border rounded-xl px-4 py-3 min-h-[80px]"
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500">Start Date</label>
                  <input
                    className="w-full border rounded-xl px-4 py-3 mt-1"
                    type="datetime-local"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-500">End Date</label>
                  <input
                    className="w-full border rounded-xl px-4 py-3 mt-1"
                    type="datetime-local"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </div>

              <select
                className="w-full border rounded-xl px-4 py-3"
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
              >
                <option value="affiliate">Affiliate Only</option>
                <option value="public">Public</option>
                <option value="both">Both</option>
              </select>

              {/* Reward Section */}
              <div className="rounded-2xl border p-4 space-y-3">
                <div className="font-semibold flex items-center gap-2">
                  <Gift className="w-4 h-4" /> Reward
                </div>
                <select
                  className="w-full border rounded-xl px-4 py-3"
                  value={form.reward.type}
                  onChange={(e) => setForm({ ...form, reward: { ...form.reward, type: e.target.value } })}
                >
                  <option value="percentage_discount">Percentage Discount</option>
                  <option value="fixed_discount">Fixed Discount</option>
                  <option value="free_addon">Free Add-on</option>
                </select>

                <input
                  className="w-full border rounded-xl px-4 py-3"
                  placeholder="Reward value"
                  type="number"
                  value={form.reward.value}
                  onChange={(e) => setForm({ ...form, reward: { ...form.reward, value: e.target.value } })}
                />

                {form.reward.type === "percentage_discount" && (
                  <input
                    className="w-full border rounded-xl px-4 py-3"
                    placeholder="Discount cap (TZS)"
                    type="number"
                    value={form.reward.cap}
                    onChange={(e) => setForm({ ...form, reward: { ...form.reward, cap: e.target.value } })}
                  />
                )}

                {form.reward.type === "free_addon" && (
                  <input
                    className="w-full border rounded-xl px-4 py-3"
                    placeholder="Free add-on code"
                    value={form.reward.free_addon_code}
                    onChange={(e) => setForm({ ...form, reward: { ...form.reward, free_addon_code: e.target.value } })}
                  />
                )}
              </div>

              {/* Eligibility Section */}
              <div className="rounded-2xl border p-4 space-y-3">
                <div className="font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4" /> Eligibility
                </div>
                <input
                  className="w-full border rounded-xl px-4 py-3"
                  placeholder="Minimum order amount (TZS)"
                  type="number"
                  value={form.eligibility.min_order_amount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      eligibility: { ...form.eligibility, min_order_amount: e.target.value },
                    })
                  }
                />
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.eligibility.requires_affiliate_code}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        eligibility: { ...form.eligibility, requires_affiliate_code: e.target.checked },
                      })
                    }
                    className="w-5 h-5 rounded"
                  />
                  <span>Requires affiliate code</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.eligibility.first_order_only}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        eligibility: { ...form.eligibility, first_order_only: e.target.checked },
                      })
                    }
                    className="w-5 h-5 rounded"
                  />
                  <span>First order only</span>
                </label>
              </div>

              {/* Marketing Section */}
              <div className="rounded-2xl border p-4 space-y-3">
                <div className="font-semibold flex items-center gap-2">
                  <Megaphone className="w-4 h-4" /> Marketing
                </div>
                <input
                  className="w-full border rounded-xl px-4 py-3"
                  placeholder="Promo code"
                  value={form.marketing.promo_code}
                  onChange={(e) => setForm({ ...form, marketing: { ...form.marketing, promo_code: e.target.value } })}
                />
                <input
                  className="w-full border rounded-xl px-4 py-3"
                  placeholder="Landing URL"
                  value={form.marketing.landing_url}
                  onChange={(e) => setForm({ ...form, marketing: { ...form.marketing, landing_url: e.target.value } })}
                />
                <input
                  className="w-full border rounded-xl px-4 py-3"
                  placeholder="CTA text"
                  value={form.marketing.cta}
                  onChange={(e) => setForm({ ...form, marketing: { ...form.marketing, cta: e.target.value } })}
                />
                <input
                  className="w-full border rounded-xl px-4 py-3"
                  placeholder="Hashtags (comma separated)"
                  value={(form.marketing.hashtags || []).join(", ")}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      marketing: {
                        ...form.marketing,
                        hashtags: e.target.value.split(",").map((x) => x.trim()).filter(Boolean),
                      },
                    })
                  }
                />
              </div>

              <Button
                onClick={createCampaign}
                disabled={creating || !form.name}
                className="w-full bg-[#2D3E50] hover:bg-[#1e2d3d]"
              >
                {creating ? "Creating..." : "Create Campaign"}
              </Button>
            </div>
          )}

          {/* Share Messages Panel */}
          {selectedMessages && (
            <div className="rounded-3xl border bg-white p-6 space-y-4">
              <h2 className="text-2xl font-bold">Share Messages</h2>
              <p className="text-slate-500 text-sm">Copy platform-optimized messages for your campaign</p>

              {Object.entries(selectedMessages).map(([platform, message]) => (
                <div key={platform} className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold capitalize">{platform}</div>
                    <button
                      onClick={() => copyToClipboard(message)}
                      className="flex items-center gap-1 text-sm text-[#2D3E50] hover:underline"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                  </div>
                  <div className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 p-3 rounded-xl">
                    {message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
