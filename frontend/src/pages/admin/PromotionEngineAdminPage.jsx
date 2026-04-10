import React, { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, Plus, Trash2, Play, Pause, Eye, AlertTriangle,
  Check, X, DollarSign, Percent, Shield, ShieldAlert,
  ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirmModal } from "@/contexts/ConfirmModalContext";

const SCOPE_OPTIONS = [
  { value: "global", label: "Global (all products)" },
  { value: "category", label: "Category" },
  { value: "product", label: "Specific Product" },
];

const STACKING_OPTIONS = [
  { value: "no_stack", label: "No Stacking", desc: "Promo replaces affiliate customer discount" },
  { value: "cap_total", label: "Cap Total", desc: "Promo + affiliate discount capped at distributable pool" },
  { value: "reduce_affiliate", label: "Reduce Affiliate", desc: "Affiliate share scales down proportionally" },
];

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-700",
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  ended: "bg-red-100 text-red-700",
};

// ─── Safety Preview Panel ───

function SafetyPreview({ promoType, promoValue, stackingPolicy }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [vendorPrice, setVendorPrice] = useState(100000);

  const runPreview = useCallback(async () => {
    if (!promoValue || promoValue <= 0) return;
    setLoading(true);
    try {
      const { data } = await api.post("/api/promotion-engine/preview-with-defaults", {
        vendor_price: vendorPrice,
        promo_type: promoType,
        promo_value: promoValue,
        stacking_policy: stackingPolicy,
      });
      setPreview(data);
    } catch {
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [vendorPrice, promoType, promoValue, stackingPolicy]);

  useEffect(() => {
    const t = setTimeout(runPreview, 400);
    return () => clearTimeout(t);
  }, [runPreview]);

  if (!preview) return null;

  const fmt = (v) => `TZS ${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;

  return (
    <div className={`border rounded-xl p-4 mt-4 ${preview.safe ? "border-emerald-200 bg-emerald-50/30" : "border-red-300 bg-red-50/30"}`}
      data-testid="safety-preview-panel">
      <div className="flex items-center gap-2 mb-3">
        {preview.safe ? (
          <Shield className="w-5 h-5 text-emerald-600" />
        ) : (
          <ShieldAlert className="w-5 h-5 text-red-600" />
        )}
        <span className={`font-semibold text-sm ${preview.safe ? "text-emerald-700" : "text-red-700"}`}>
          {preview.safe ? "Safe Promotion" : "UNSAFE — Blocked"}
        </span>
        {loading && <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />}
      </div>

      {!preview.safe && (
        <div className="bg-red-100 border border-red-200 rounded-lg p-3 mb-3 text-sm text-red-700" data-testid="blocked-reason">
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          {preview.blocked_reason}
        </div>
      )}

      {/* Vendor price selector */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-slate-500">Sample vendor price:</span>
        {[50000, 100000, 200000, 500000].map((p) => (
          <button key={p}
            onClick={() => setVendorPrice(p)}
            className={`text-xs px-2 py-1 rounded-md transition ${vendorPrice === p ? "bg-[#1f3a5f] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            data-testid={`vendor-price-${p}`}
          >
            {(p / 1000).toFixed(0)}k
          </button>
        ))}
      </div>

      {/* Pricing breakdown */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm" data-testid="pricing-breakdown">
        <div className="text-slate-500">Standard Price</div>
        <div className="font-medium text-right">{fmt(preview.standard_price)}</div>

        <div className="text-slate-500">Promo Discount</div>
        <div className="font-medium text-right text-red-600">- {fmt(preview.promo_discount)}</div>

        <div className="text-slate-600 font-semibold border-t pt-1">Promo Price</div>
        <div className="font-bold text-right border-t pt-1 text-emerald-700">{fmt(preview.promo_price)}</div>

        <div className="col-span-2 mt-2 mb-1 text-xs font-semibold text-slate-600 uppercase tracking-wider">Margin Breakdown</div>

        <div className="text-slate-500">Operational Margin</div>
        <div className="font-medium text-right">{fmt(preview.operational_margin)}</div>

        <div className="text-slate-500">Distributable Pool</div>
        <div className="font-medium text-right">{fmt(preview.distributable_pool_original)}</div>

        <div className="text-slate-500">Remaining Distributable</div>
        <div className={`font-medium text-right ${preview.distributable_pool_remaining < 0 ? "text-red-600" : ""}`}>
          {fmt(preview.distributable_pool_remaining)}
        </div>

        <div className="col-span-2 mt-2 mb-1 text-xs font-semibold text-slate-600 uppercase tracking-wider">Commission Effect</div>

        <div className="text-slate-500">Affiliate Earns</div>
        <div className="font-medium text-right">{fmt(preview.effective_affiliate_amount)}</div>

        <div className="text-slate-500">Sales Earns</div>
        <div className="font-medium text-right">{fmt(preview.effective_sales_amount)}</div>

        <div className="text-slate-500">Customer Discount</div>
        <div className="font-medium text-right">{fmt(preview.effective_discount_amount)}</div>
      </div>
    </div>
  );
}

// ─── Promotion Form ───

function PromotionForm({ existing, onSave, onCancel }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    title: existing?.title || "",
    scope: existing?.scope || "global",
    scope_target: existing?.scope_target || "",
    promo_type: existing?.promo_type || "percentage",
    promo_value: existing?.promo_value || "",
    stacking_policy: existing?.stacking_policy || "no_stack",
    starts_at: existing?.starts_at?.split("T")[0] || "",
    ends_at: existing?.ends_at?.split("T")[0] || "",
    status: existing?.status || "draft",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (asStatus) => {
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.promo_value || Number(form.promo_value) <= 0) return toast.error("Promo value must be > 0");
    setSaving(true);
    try {
      const payload = {
        ...form,
        promo_value: Number(form.promo_value),
        status: asStatus || form.status,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        scope_target: form.scope === "global" ? null : form.scope_target,
      };

      if (isEdit) {
        await api.put(`/api/promotion-engine/promotions/${existing.id}`, payload);
        toast.success("Promotion updated");
      } else {
        await api.post("/api/promotion-engine/promotions", payload);
        toast.success("Promotion created");
      }
      onSave();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save promotion");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border rounded-xl p-6" data-testid="promotion-form">
      <h3 className="font-semibold text-lg text-[#20364D] mb-4">
        {isEdit ? "Edit Promotion" : "Create Promotion"}
      </h3>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Campaign Title</label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Ramadan 10% Off"
            data-testid="promo-title-input"
          />
        </div>

        {/* Type & Value Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Type</label>
            <select
              value={form.promo_type}
              onChange={(e) => setForm({ ...form, promo_type: e.target.value })}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
              data-testid="promo-type-select"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (TZS)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              {form.promo_type === "percentage" ? "Discount %" : "Discount Amount (TZS)"}
            </label>
            <Input
              type="number"
              value={form.promo_value}
              onChange={(e) => setForm({ ...form, promo_value: e.target.value })}
              placeholder={form.promo_type === "percentage" ? "e.g. 5" : "e.g. 5000"}
              data-testid="promo-value-input"
            />
          </div>
        </div>

        {/* Scope */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Scope</label>
            <select
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
              data-testid="promo-scope-select"
            >
              {SCOPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          {form.scope !== "global" && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Target ID</label>
              <Input
                value={form.scope_target}
                onChange={(e) => setForm({ ...form, scope_target: e.target.value })}
                placeholder={form.scope === "product" ? "Product ID" : "Category slug"}
                data-testid="promo-target-input"
              />
            </div>
          )}
        </div>

        {/* Stacking Policy */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Stacking Policy</label>
          <div className="space-y-2">
            {STACKING_OPTIONS.map((opt) => (
              <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${form.stacking_policy === opt.value ? "border-[#1f3a5f] bg-blue-50/50" : "border-slate-200 hover:bg-slate-50"}`}>
                <input
                  type="radio"
                  name="stacking"
                  value={opt.value}
                  checked={form.stacking_policy === opt.value}
                  onChange={() => setForm({ ...form, stacking_policy: opt.value })}
                  className="mt-0.5"
                  data-testid={`stacking-${opt.value}`}
                />
                <div>
                  <div className="font-medium text-sm text-slate-800">{opt.label}</div>
                  <div className="text-xs text-slate-500">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Start Date (optional)</label>
            <Input
              type="date"
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              data-testid="promo-starts-at"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">End Date (optional)</label>
            <Input
              type="date"
              value={form.ends_at}
              onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              data-testid="promo-ends-at"
            />
          </div>
        </div>
      </div>

      {/* Live Safety Preview */}
      <SafetyPreview
        promoType={form.promo_type}
        promoValue={Number(form.promo_value) || 0}
        stackingPolicy={form.stacking_policy}
      />

      {/* Actions */}
      <div className="flex items-center gap-3 mt-6 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} data-testid="promo-cancel-btn">
          Cancel
        </Button>
        <Button onClick={() => handleSave("draft")} disabled={saving} data-testid="promo-save-draft-btn">
          {saving ? "Saving..." : "Save as Draft"}
        </Button>
        <Button
          onClick={() => handleSave("active")}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          data-testid="promo-activate-btn"
        >
          {saving ? "..." : "Save & Activate"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ───

export default function PromotionEngineAdminPage() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const { confirmAction } = useConfirmModal();

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/promotion-engine/promotions");
      setPromotions(data);
    } catch {
      toast.error("Failed to load promotions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const toggleStatus = async (promo) => {
    const newStatus = promo.status === "active" ? "paused" : "active";
    try {
      await api.put(`/api/promotion-engine/promotions/${promo.id}`, { status: newStatus });
      toast.success(`Promotion ${newStatus === "active" ? "activated" : "paused"}`);
      fetchPromotions();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to update status");
    }
  };

  const deletePromo = async (id) => {
    confirmAction({
      title: "Delete Promotion?",
      message: "This promotion will be permanently deleted.",
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: async () => {
        try {
          await api.delete(`/api/promotion-engine/promotions/${id}`);
          toast.success("Promotion deleted");
          fetchPromotions();
        } catch {
          toast.error("Failed to delete");
        }
      },
    });
  };

  const fmt = (v) => `TZS ${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6" data-testid="promotion-engine-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">Promotions Engine</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create, manage, and preview platform promotions with margin safety protection
          </p>
        </div>
        <Button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="gap-2"
          data-testid="create-promotion-btn"
        >
          <Plus className="w-4 h-4" /> Create Promotion
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <PromotionForm
          existing={editing}
          onSave={() => { setShowForm(false); setEditing(null); fetchPromotions(); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {/* Promotions List */}
      <div className="bg-white border rounded-xl overflow-hidden" data-testid="promotions-list">
        <div className="px-6 py-4 border-b bg-slate-50/50">
          <h2 className="font-semibold text-[#20364D]">All Promotions</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : promotions.length === 0 ? (
          <div className="p-8 text-center" data-testid="no-promotions">
            <TrendingUp className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">No promotions yet. Create your first campaign.</p>
          </div>
        ) : (
          <div className="divide-y">
            {promotions.map((promo) => (
              <div key={promo.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition" data-testid={`promo-row-${promo.id}`}>
                {/* Status Badge */}
                <Badge className={`${STATUS_COLORS[promo.status] || STATUS_COLORS.draft} capitalize text-xs`} data-testid={`promo-status-${promo.id}`}>
                  {promo.status}
                </Badge>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#20364D] truncate">{promo.title}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="capitalize">{promo.scope}</span>
                    <span>
                      {promo.promo_type === "percentage" ? `${promo.promo_value}% off` : `${fmt(promo.promo_value)} off`}
                    </span>
                    <span className="capitalize">{promo.stacking_policy?.replace("_", " ")}</span>
                    {promo.ends_at && (
                      <span>Ends: {new Date(promo.ends_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setEditing(promo); setShowForm(true); }}
                    data-testid={`edit-promo-${promo.id}`}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleStatus(promo)}
                    data-testid={`toggle-promo-${promo.id}`}
                  >
                    {promo.status === "active" ? <Pause className="w-4 h-4 text-amber-600" /> : <Play className="w-4 h-4 text-emerald-600" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePromo(promo.id)}
                    data-testid={`delete-promo-${promo.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
