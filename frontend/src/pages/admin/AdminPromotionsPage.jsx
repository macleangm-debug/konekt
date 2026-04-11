import React, { useEffect, useState, useMemo } from "react";
import { Plus, Search, Tag, Percent, DollarSign, Calendar, Users, Layers, Trash2, ToggleLeft, ToggleRight, AlertTriangle, CheckCircle2, X, Loader2, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import { safeDisplay, safeMoney } from "@/utils/safeDisplay";
import StandardDrawerShell from "@/components/ui/StandardDrawerShell";

const SCOPE_OPTIONS = [
  { value: "global", label: "All Products" },
  { value: "category", label: "Specific Category" },
  { value: "product", label: "Specific Product" },
];

const DISCOUNT_TYPES = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "fixed_amount", label: "Fixed Amount (TZS)" },
];

const STACKING_RULES = [
  { value: "no_stack", label: "No Stacking", desc: "Cannot combine with other promotions" },
  { value: "stack_with_cap", label: "Stack with Cap", desc: "Can combine, capped at promotion allocation" },
  { value: "reduce_when_affiliate", label: "Reduce with Affiliate", desc: "Value reduced 50% when affiliate is active" },
  { value: "referral_priority", label: "Referral Priority", desc: "Blocked when referral is used" },
];

const STATUS_COLORS = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-600",
  expired: "bg-red-100 text-red-600",
  scheduled: "bg-blue-100 text-blue-600",
};

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "expired", label: "Expired" },
];

function authHeaders() {
  const token = localStorage.getItem("konekt_token") || localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

export default function AdminPromotionsPage() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editPromo, setEditPromo] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const fetchPromos = async () => {
    try {
      const res = await api.get(`/api/admin/promotions?status=${statusFilter}`, { headers: authHeaders() });
      setPromos(res.data?.promotions || []);
    } catch { setPromos([]); }
    setLoading(false);
  };

  useEffect(() => { fetchPromos(); }, [statusFilter]);

  useEffect(() => {
    api.get("/api/admin/catalog/categories", { headers: authHeaders() }).then(r => setCategories(r.data || [])).catch(() => {});
    api.get("/api/admin/products?limit=200", { headers: authHeaders() }).then(r => setProducts(r.data?.products || [])).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return promos;
    const q = search.toLowerCase();
    return promos.filter(p => p.code?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q));
  }, [promos, search]);

  const openCreate = () => { setEditPromo(null); setShowForm(true); };
  const openEdit = (p) => { setEditPromo(p); setShowForm(true); };

  const toggleStatus = async (promo) => {
    try {
      const endpoint = promo.status === "active" ? "deactivate" : "activate";
      await api.post(`/api/admin/promotions/${promo.id}/${endpoint}`, {}, { headers: authHeaders() });
      fetchPromos();
    } catch {}
  };

  const deletePromo = async (promo) => {
    if (!window.confirm(`Delete promotion "${promo.name}"?`)) return;
    try {
      await api.delete(`/api/admin/promotions/${promo.id}`, { headers: authHeaders() });
      fetchPromos();
    } catch {}
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditPromo(null);
    fetchPromos();
  };

  const stats = useMemo(() => ({
    total: promos.length,
    active: promos.filter(p => p.status === "active").length,
    totalUses: promos.reduce((s, p) => s + (p.current_uses || 0), 0),
  }), [promos]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6" data-testid="admin-promotions-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#20364D]">Promotions</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage discount codes and promotional campaigns</p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-xl bg-[#20364D] text-white px-4 py-2 text-sm font-semibold flex items-center gap-2 hover:bg-[#1a2d40] transition-colors"
          data-testid="create-promo-btn"
        >
          <Plus className="w-4 h-4" /> New Promotion
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Promotions" value={stats.total} icon={Tag} />
        <StatCard label="Active" value={stats.active} icon={CheckCircle2} />
        <StatCard label="Total Redemptions" value={stats.totalUses} icon={Users} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          {STATUS_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${statusFilter === t.key ? "bg-[#20364D] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
              data-testid={`promo-filter-${t.key}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code or name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-1 focus:ring-[#20364D] focus:border-[#20364D] outline-none"
            data-testid="promo-search-input"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left" data-testid="promotions-table">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Code</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Scope</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Discount</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Stacking</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Uses</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12">
                  <Tag className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-600">No promotions found</p>
                  <p className="text-xs text-slate-400 mt-1">Create your first promotion to get started</p>
                </td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors" data-testid={`promo-row-${p.id}`}>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-sm text-[#20364D]" data-testid={`promo-code-${p.id}`}>{safeDisplay(p.code, "code")}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-slate-700">{safeDisplay(p.name, "text")}</div>
                    {p.description && <div className="text-xs text-slate-400 truncate max-w-[200px]">{p.description}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <ScopeBadge scope={p.scope} targetName={p.target_category_name || p.target_product_name} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-[#20364D]">
                      {p.discount_type === "percentage" ? `${p.discount_value}%` : `TZS ${Number(p.discount_value || 0).toLocaleString()}`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-600">{STACKING_RULES.find(s => s.value === p.stacking_rule)?.label || safeDisplay(p.stacking_rule, "text")}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {p.current_uses || 0}{p.max_total_uses ? ` / ${p.max_total_uses}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] || "bg-slate-100 text-slate-600"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="text-slate-400 hover:text-[#20364D] p-1 transition-colors" data-testid={`edit-promo-${p.id}`}>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleStatus(p)} className="text-slate-400 hover:text-amber-600 p-1 transition-colors" data-testid={`toggle-promo-${p.id}`}>
                        {p.status === "active" ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button onClick={() => deletePromo(p)} className="text-slate-400 hover:text-red-500 p-1 transition-colors" data-testid={`delete-promo-${p.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Drawer */}
      <StandardDrawerShell
        open={showForm}
        onClose={() => { setShowForm(false); setEditPromo(null); }}
        title={editPromo ? "Edit Promotion" : "New Promotion"}
        subtitle={editPromo ? "Update promotion settings" : "Create a new promotional discount code"}
        testId="promotion-drawer"
      >
          <PromotionForm
            initial={editPromo}
            categories={categories}
            products={products}
            onSaved={handleSaved}
            onCancel={() => { setShowForm(false); setEditPromo(null); }}
          />
      </StandardDrawerShell>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center">
        <Icon className="w-5 h-5 text-[#20364D]" />
      </div>
      <div>
        <div className="text-xl font-bold text-[#20364D]">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function ScopeBadge({ scope, targetName }) {
  const colors = { global: "bg-blue-50 text-blue-700", category: "bg-purple-50 text-purple-700", product: "bg-amber-50 text-amber-700" };
  return (
    <div>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[scope] || "bg-slate-100 text-slate-600"}`}>
        {scope === "global" ? "All Products" : scope}
      </span>
      {targetName && <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[120px]">{targetName}</div>}
    </div>
  );
}

function PromotionForm({ initial, categories, products, onSaved, onCancel }) {
  const [form, setForm] = useState({
    name: "", code: "", description: "", scope: "global",
    target_category_id: "", target_category_name: "",
    target_product_id: "", target_product_name: "",
    discount_type: "percentage", discount_value: "",
    stacking_rule: "no_stack",
    start_date: "", end_date: "",
    max_total_uses: "", max_uses_per_customer: "",
    customer_message: "",
    ...(initial || {}),
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [productSearch, setProductSearch] = useState("");

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 20);
    const q = productSearch.toLowerCase();
    return products.filter(p => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)).slice(0, 20);
  }, [products, productSearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    setWarnings([]);

    const payload = {
      ...form,
      discount_value: parseFloat(form.discount_value) || 0,
      max_total_uses: form.max_total_uses ? parseInt(form.max_total_uses) : null,
      max_uses_per_customer: form.max_uses_per_customer ? parseInt(form.max_uses_per_customer) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };

    try {
      const token = localStorage.getItem("konekt_token") || localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      let res;
      if (initial?.id) {
        res = await api.put(`/api/admin/promotions/${initial.id}`, payload, { headers });
      } else {
        res = await api.post("/api/admin/promotions", payload, { headers });
      }
      if (res.data?._warnings) {
        setWarnings(res.data._warnings);
      }
      onSaved();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail?.errors) {
        setErrors(detail.errors);
      } else {
        setErrors([typeof detail === "string" ? detail : "Failed to save promotion"]);
      }
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 mt-4" data-testid="promotion-form">
      {errors.length > 0 && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-1" data-testid="promo-form-errors">
          {errors.map((e, i) => <div key={i} className="flex items-start gap-1.5"><AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{e}</div>)}
        </div>
      )}
      {warnings.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 space-y-1" data-testid="promo-form-warnings">
          {warnings.map((w, i) => <div key={i} className="flex items-start gap-1.5"><AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{w}</div>)}
        </div>
      )}

      {/* Name & Code */}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Promotion Name" required>
          <input type="text" value={form.name} onChange={e => update("name", e.target.value)} placeholder="e.g. Summer Sale" className="form-input" data-testid="promo-name-input" />
        </FormField>
        <FormField label="Promo Code" required>
          <input type="text" value={form.code} onChange={e => update("code", e.target.value.toUpperCase())} placeholder="e.g. SUMMER26" className="form-input font-mono" data-testid="promo-code-input" />
        </FormField>
      </div>

      <FormField label="Description">
        <textarea value={form.description} onChange={e => update("description", e.target.value)} rows={2} placeholder="Optional internal description" className="form-input resize-none" data-testid="promo-desc-input" />
      </FormField>

      {/* Scope */}
      <FormField label="Scope" required>
        <div className="grid grid-cols-3 gap-2">
          {SCOPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("scope", opt.value)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${form.scope === opt.value ? "border-[#20364D] bg-[#20364D]/5 text-[#20364D]" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
              data-testid={`scope-${opt.value}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FormField>

      {/* Category selector */}
      {form.scope === "category" && (
        <FormField label="Target Category" required>
          <select
            value={form.target_category_id}
            onChange={e => {
              const cat = categories.find(c => c.id === e.target.value);
              update("target_category_id", e.target.value);
              update("target_category_name", cat?.name || "");
            }}
            className="form-input"
            data-testid="promo-category-select"
          >
            <option value="">Select a category...</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FormField>
      )}

      {/* Product selector */}
      {form.scope === "product" && (
        <FormField label="Target Product" required>
          <input
            type="text"
            value={productSearch}
            onChange={e => setProductSearch(e.target.value)}
            placeholder="Search products..."
            className="form-input mb-2"
            data-testid="promo-product-search"
          />
          <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-200">
            {filteredProducts.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => { update("target_product_id", p.id); update("target_product_name", p.name); setProductSearch(p.name); }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 transition-colors ${form.target_product_id === p.id ? "bg-[#20364D]/5 font-semibold" : ""}`}
              >
                {p.name} {p.sku ? `(${p.sku})` : ""}
              </button>
            ))}
          </div>
        </FormField>
      )}

      {/* Discount */}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Discount Type" required>
          <select value={form.discount_type} onChange={e => update("discount_type", e.target.value)} className="form-input" data-testid="promo-discount-type">
            {DISCOUNT_TYPES.map(dt => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
          </select>
        </FormField>
        <FormField label={form.discount_type === "percentage" ? "Discount (%)" : "Discount (TZS)"} required>
          <input type="number" value={form.discount_value} onChange={e => update("discount_value", e.target.value)} placeholder="e.g. 5" className="form-input" step="0.1" data-testid="promo-discount-value" />
        </FormField>
      </div>

      {/* Stacking Rule */}
      <FormField label="Stacking Rule" required>
        <div className="space-y-2">
          {STACKING_RULES.map(rule => (
            <label key={rule.value} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${form.stacking_rule === rule.value ? "border-[#20364D] bg-[#20364D]/5" : "border-slate-200 hover:border-slate-300"}`}>
              <input
                type="radio"
                name="stacking_rule"
                value={rule.value}
                checked={form.stacking_rule === rule.value}
                onChange={e => update("stacking_rule", e.target.value)}
                className="mt-0.5"
                data-testid={`stacking-${rule.value}`}
              />
              <div>
                <div className="text-sm font-semibold text-slate-700">{rule.label}</div>
                <div className="text-xs text-slate-500">{rule.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </FormField>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Start Date">
          <input type="datetime-local" value={form.start_date ? form.start_date.slice(0, 16) : ""} onChange={e => update("start_date", e.target.value ? new Date(e.target.value).toISOString() : "")} className="form-input" data-testid="promo-start-date" />
        </FormField>
        <FormField label="End Date">
          <input type="datetime-local" value={form.end_date ? form.end_date.slice(0, 16) : ""} onChange={e => update("end_date", e.target.value ? new Date(e.target.value).toISOString() : "")} className="form-input" data-testid="promo-end-date" />
        </FormField>
      </div>

      {/* Usage Limits */}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Max Total Uses">
          <input type="number" value={form.max_total_uses ?? ""} onChange={e => update("max_total_uses", e.target.value)} placeholder="Unlimited" className="form-input" data-testid="promo-max-uses" />
        </FormField>
        <FormField label="Max Per Customer">
          <input type="number" value={form.max_uses_per_customer ?? ""} onChange={e => update("max_uses_per_customer", e.target.value)} placeholder="Unlimited" className="form-input" data-testid="promo-max-per-customer" />
        </FormField>
      </div>

      {/* Customer Message */}
      <FormField label="Customer Message">
        <input type="text" value={form.customer_message} onChange={e => update("customer_message", e.target.value)} placeholder="Message shown to customer when promo is applied" className="form-input" data-testid="promo-customer-message" />
      </FormField>

      {/* Info Box */}
      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700 space-y-1">
        <div className="flex items-start gap-1.5"><CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" /> Promotions consume only from the <strong>promotion allocation</strong> of the distributable pool</div>
        <div className="flex items-start gap-1.5"><CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" /> Vendor base cost and platform protected margin are never touched</div>
        <div className="flex items-start gap-1.5"><CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" /> Discounts are automatically capped at the tier's promotion allocation at order time</div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors" data-testid="promo-cancel-btn">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="rounded-xl bg-[#20364D] text-white px-5 py-2 text-sm font-semibold hover:bg-[#1a2d40] disabled:opacity-50 transition-colors" data-testid="promo-save-btn">
          {saving ? "Saving..." : initial ? "Update Promotion" : "Create Promotion"}
        </button>
      </div>
    </form>
  );
}

function FormField({ label, required, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-600 mb-1 block">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      <style>{`.form-input { width: 100%; border-radius: 0.5rem; border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; transition: border-color 0.15s, box-shadow 0.15s; } .form-input:focus { border-color: #20364D; box-shadow: 0 0 0 1px #20364D; }`}</style>
    </div>
  );
}
