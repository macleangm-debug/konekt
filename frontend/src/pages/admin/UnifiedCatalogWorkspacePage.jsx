import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Tag, AlertTriangle, Search, Eye, Loader2, RefreshCw, Plus, ChevronDown, ChevronUp, Settings2, Save, LayoutGrid, List, Zap, ShoppingCart, Upload, FileSpreadsheet, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";

const money = (v) => `TZS ${Number(v || 0).toLocaleString("en-US")}`;

const MODE_LABELS = {
  visual: { label: "Visual", color: "bg-blue-100 text-blue-700", icon: LayoutGrid },
  list_quote: { label: "List & Quote", color: "bg-violet-100 text-violet-700", icon: List },
};
const COMMERCIAL_LABELS = {
  fixed_price: { label: "Fixed Price", color: "bg-emerald-100 text-emerald-700" },
  request_quote: { label: "Request Quote", color: "bg-amber-100 text-amber-700" },
  hybrid: { label: "Hybrid", color: "bg-cyan-100 text-cyan-700" },
};
const SOURCING_LABELS = {
  preferred: { label: "Single Vendor", color: "bg-slate-100 text-slate-600" },
  competitive: { label: "Competitive", color: "bg-blue-100 text-blue-700" },
};

function ConfigSelect({ label, value, onChange, options, help }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide block mb-1">{label}</label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#D4A843]/30 focus:border-[#D4A843] outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {help && <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{help}</p>}
    </div>
  );
}

function ConfigToggle({ label, checked, onChange, help }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <button
        onClick={() => onChange(!checked)}
        className={`mt-0.5 flex-shrink-0 w-9 h-5 rounded-full transition-colors relative ${checked ? "bg-[#D4A843]" : "bg-slate-200"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
      <div className="min-w-0">
        <div className="text-sm text-[#20364D] font-medium">{label}</div>
        {help && <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{help}</p>}
      </div>
    </div>
  );
}

function CategoryConfigCard({ cat, onSave }) {
  const [expanded, setExpanded] = useState(false);
  const [local, setLocal] = useState({ ...cat });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const update = (field, value) => {
    setLocal((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/api/admin/catalog-workspace/categories/${encodeURIComponent(cat.name)}`, {
        display_mode: local.display_mode,
        commercial_mode: local.commercial_mode,
        sourcing_mode: local.sourcing_mode,
        allow_custom_items: local.allow_custom_items,
        require_description: local.require_description,
        show_price_in_list: local.show_price_in_list,
        multi_item_request: local.multi_item_request,
        search_first: local.search_first,
      });
      toast.success(`${cat.name} updated`);
      setDirty(false);
      onSave?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save");
    }
    setSaving(false);
  };

  const dm = MODE_LABELS[local.display_mode] || MODE_LABELS.visual;
  const cm = COMMERCIAL_LABELS[local.commercial_mode] || COMMERCIAL_LABELS.fixed_price;
  const sm = SOURCING_LABELS[local.sourcing_mode] || SOURCING_LABELS.preferred;

  return (
    <div className={`bg-white rounded-xl border transition-shadow ${expanded ? "shadow-md border-[#D4A843]/30" : "hover:shadow-sm"}`} data-testid={`category-config-${cat.name?.replace(/\s/g, "-")}`}>
      {/* Collapsed Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 text-left"
        data-testid={`category-expand-${cat.name?.replace(/\s/g, "-")}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#20364D]">{cat.name}</h3>
            <span className="text-[10px] text-slate-400">{cat.product_count || 0} product{(cat.product_count || 0) !== 1 ? "s" : ""}</span>
            {dirty && <Badge className="bg-amber-100 text-amber-700 text-[8px]">Unsaved</Badge>}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Badge className={`text-[9px] ${dm.color}`}>{dm.label}</Badge>
            <Badge className={`text-[9px] ${cm.color}`}>{cm.label}</Badge>
            <Badge className={`text-[9px] ${sm.color}`}>{sm.label}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Settings2 className="w-4 h-4 text-slate-300" />
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* Expanded Config */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-4 space-y-5">
          {/* Core Settings */}
          <div>
            <h4 className="text-xs font-bold text-[#20364D] uppercase tracking-wider mb-3">Core Settings</h4>
            <div className="grid sm:grid-cols-3 gap-4">
              <ConfigSelect
                label="Display Mode"
                value={local.display_mode}
                onChange={(v) => update("display_mode", v)}
                options={[
                  { value: "visual", label: "Visual Catalog" },
                  { value: "list_quote", label: "List & Quote Catalog" },
                ]}
                help="Visual = image cards in marketplace. List & Quote = search-based request builder, no images."
              />
              <ConfigSelect
                label="Commercial Mode"
                value={local.commercial_mode}
                onChange={(v) => update("commercial_mode", v)}
                options={[
                  { value: "fixed_price", label: "Fixed Price" },
                  { value: "request_quote", label: "Request Quote" },
                  { value: "hybrid", label: "Hybrid" },
                ]}
                help="Fixed = user sees price and buys. Request Quote = no price, user submits request. Hybrid = shows indicative price + allows negotiation."
              />
              <ConfigSelect
                label="Sourcing Mode"
                value={local.sourcing_mode}
                onChange={(v) => update("sourcing_mode", v)}
                options={[
                  { value: "preferred", label: "Single Vendor" },
                  { value: "competitive", label: "Competitive Quoting" },
                ]}
                help="Single = all requests go to one preferred vendor. Competitive = multiple vendors quote, system picks best."
              />
            </div>
          </div>

          {/* Advanced Settings */}
          <div>
            <h4 className="text-xs font-bold text-[#20364D] uppercase tracking-wider mb-3">Advanced Settings</h4>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
              <ConfigToggle
                label="Allow Custom Items"
                checked={local.allow_custom_items ?? false}
                onChange={(v) => update("allow_custom_items", v)}
                help="Users can manually add items not found in the catalog list."
              />
              <ConfigToggle
                label="Require Description / Specification"
                checked={local.require_description ?? false}
                onChange={(v) => update("require_description", v)}
                help="Users must describe specifications. Useful for services like printing."
              />
              <ConfigToggle
                label="Show Price in List"
                checked={local.show_price_in_list ?? true}
                onChange={(v) => update("show_price_in_list", v)}
                help="Display prices in item list. Turn off for pure 'Request Quote' categories."
              />
              <ConfigToggle
                label="Multi-item Request"
                checked={local.multi_item_request ?? true}
                onChange={(v) => update("multi_item_request", v)}
                help="Users can select multiple items in a single quote request."
              />
              <ConfigToggle
                label="Search-first Mode"
                checked={local.search_first ?? false}
                onChange={(v) => update("search_first", v)}
                help="Prioritize search bar over browsing. Best for large catalogs."
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="text-[10px] text-slate-400">
              {dirty ? "You have unsaved changes" : "All changes saved"}
            </div>
            <Button
              size="sm"
              disabled={!dirty || saving}
              onClick={save}
              className="bg-[#D4A843] hover:bg-[#c49a3d] text-[#17283C] font-semibold"
              data-testid={`save-${cat.name?.replace(/\s/g, "-")}`}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UnifiedCatalogWorkspacePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/api/admin/catalog-workspace/stats")
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;

  const s = stats || {};
  const categories = s.categories || [];

  return (
    <div className="space-y-5" data-testid="catalog-workspace-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#20364D]">Catalog Workspace</h1>
          <p className="text-sm text-slate-500 mt-0.5">Category behavior, product health, and catalog configuration</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>
          <Button size="sm" className="bg-[#20364D] hover:bg-[#1a2d40]" onClick={() => navigate("/admin/vendor-ops/new-product")} data-testid="add-product-btn">
            <Plus className="w-3.5 h-3.5 mr-1" /> New Product
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3" data-testid="catalog-kpi">
        {[
          { label: "Categories", value: s.category_count || 0, color: "text-purple-600 border-purple-200" },
          { label: "Products", value: s.products || 0, color: "text-blue-600 border-blue-200" },
          { label: "Active", value: s.active_products || 0, color: "text-emerald-600 border-emerald-200" },
          { label: "Pending Review", value: s.pending_review || 0, color: "text-amber-600 border-amber-200" },
          { label: "Pricing Issues", value: s.pricing_issues || 0, color: "text-red-600 border-red-200" },
          { label: "Quote Items", value: s.quote_items || 0, color: "text-cyan-600 border-cyan-200" },
        ].map((k) => (
          <div key={k.label} className={`bg-white rounded-xl border ${k.color} p-3 text-center`} data-testid={`kpi-${k.label.toLowerCase().replace(/\s/g, "-")}`}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase">{k.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${k.color.split(" ")[0]}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Product Health Alerts */}
      {(s.pricing_issues > 0 || s.missing_images > 0) && (
        <div className="flex items-center gap-4 p-3 rounded-xl bg-amber-50 border border-amber-200" data-testid="health-alerts">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            {s.pricing_issues > 0 && <span className="font-semibold">{s.pricing_issues} pricing issues</span>}
            {s.pricing_issues > 0 && s.missing_images > 0 && " \u2022 "}
            {s.missing_images > 0 && <span>{s.missing_images} products missing images</span>}
          </div>
          <Button size="sm" variant="outline" className="ml-auto text-xs border-amber-300" onClick={() => navigate("/admin/vendor-supply-review")} data-testid="go-supply-review">
            Open Supply Review
          </Button>
        </div>
      )}

      {/* Category Summary (config moved to Settings Hub) */}
      <div className="bg-white rounded-xl border p-4" data-testid="category-summary">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#20364D]">Categories</h2>
            <p className="text-xs text-slate-400">{categories.length} categories configured</p>
          </div>
          <button onClick={() => navigate("/admin/settings-hub")} className="text-xs text-[#D4A843] hover:underline font-medium" data-testid="go-category-config">
            Configure in Settings Hub →
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {categories.map((c, i) => (
            <span key={c.name || i} className="text-[10px] px-2 py-1 rounded-lg bg-slate-50 border text-slate-600">{c.name}</span>
          ))}
        </div>
      </div>

      {/* Bulk Import */}
      <BulkImportSection onImported={load} />

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-3">
        <button onClick={() => navigate("/admin/vendor-supply-review")} className="bg-white rounded-xl border p-4 text-left hover:shadow-md transition group" data-testid="qa-supply-review">
          <div className="flex items-center gap-2 mb-1"><Eye className="w-4 h-4 text-amber-500" /><span className="text-sm font-semibold text-[#20364D]">Supply Review</span></div>
          <p className="text-xs text-slate-500">{s.pending_review || 0} pending approvals, {s.pricing_issues || 0} pricing issues</p>
        </button>
        <button onClick={() => navigate("/admin/vendor-ops")} className="bg-white rounded-xl border p-4 text-left hover:shadow-md transition group" data-testid="qa-vendor-ops">
          <div className="flex items-center gap-2 mb-1"><Package className="w-4 h-4 text-blue-500" /><span className="text-sm font-semibold text-[#20364D]">Vendor Ops</span></div>
          <p className="text-xs text-slate-500">Products, vendors, and price requests</p>
        </button>
        <button onClick={() => navigate("/admin/vendor-ops/new-product")} className="bg-white rounded-xl border p-4 text-left hover:shadow-md transition group" data-testid="qa-new-product">
          <div className="flex items-center gap-2 mb-1"><Plus className="w-4 h-4 text-emerald-500" /><span className="text-sm font-semibold text-[#20364D]">New Product</span></div>
          <p className="text-xs text-slate-500">Upload a new product using the wizard</p>
        </button>
      </div>
    </div>
  );
}


function BulkImportSection({ onImported }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/api/admin/catalog-workspace/bulk-import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      toast.success(`Imported ${res.data.imported} items`);
      onImported?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Import failed");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="bg-white rounded-xl border p-4" data-testid="bulk-import-section">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-[#D4A843]" />
          <div>
            <h3 className="text-sm font-bold text-[#20364D]">Bulk Import</h3>
            <p className="text-xs text-slate-400">Upload CSV with columns: name, category, subcategory, unit_of_measurement, sku, description, active</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/admin/catalog-workspace/bulk-import-template" download className="text-xs text-blue-600 hover:underline">Download Template</a>
          <input ref={fileRef} type="file" accept=".csv,.xlsx" onChange={handleUpload} className="hidden" data-testid="import-file-input" />
          <Button
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            data-testid="bulk-import-btn"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
            {uploading ? "Importing..." : "Upload CSV"}
          </Button>
        </div>
      </div>
      {result && (
        <div className="mt-3 p-3 rounded-lg bg-slate-50 border text-sm" data-testid="import-result">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-emerald-600"><CheckCircle className="w-4 h-4" /> {result.imported} imported</div>
            {result.skipped > 0 && <div className="flex items-center gap-1 text-amber-600"><XCircle className="w-4 h-4" /> {result.skipped} skipped</div>}
          </div>
          {result.errors?.length > 0 && (
            <div className="mt-2 text-xs text-slate-500">
              {result.errors.slice(0, 5).map((e, i) => (
                <div key={i}>Row {e.row}: {e.error}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
