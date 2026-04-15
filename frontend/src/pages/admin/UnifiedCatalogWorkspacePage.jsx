import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Wrench, Tag, AlertTriangle, CheckCircle2, Search, ShoppingCart, FileText, Eye, Loader2, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";

const money = (v) => `TZS ${Number(v || 0).toLocaleString("en-US")}`;

const MODE_LABELS = {
  visual: { label: "Visual", color: "bg-blue-100 text-blue-700" },
  list_quote: { label: "List & Quote", color: "bg-violet-100 text-violet-700" },
};
const COMMERCIAL_LABELS = {
  fixed_price: { label: "Fixed Price", color: "bg-emerald-100 text-emerald-700" },
  request_quote: { label: "Request Quote", color: "bg-amber-100 text-amber-700" },
  hybrid: { label: "Hybrid", color: "bg-cyan-100 text-cyan-700" },
};
const SOURCING_LABELS = {
  preferred: { label: "Single", color: "bg-slate-100 text-slate-600" },
  competitive: { label: "Competitive", color: "bg-blue-100 text-blue-700" },
};

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
          <p className="text-sm text-slate-500 mt-0.5">Category behavior, product health, and catalog overview</p>
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

      {/* Category Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-[#20364D]">Categories</h2>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/admin/settings-hub")}>Manage in Settings</Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="category-grid">
          {categories.map((cat, i) => {
            const dm = MODE_LABELS[cat.display_mode] || MODE_LABELS.visual;
            const cm = COMMERCIAL_LABELS[cat.commercial_mode] || COMMERCIAL_LABELS.fixed_price;
            const sm = SOURCING_LABELS[cat.sourcing_mode] || SOURCING_LABELS.preferred;
            return (
              <div key={i} className="bg-white rounded-xl border p-4 hover:shadow-md transition" data-testid={`category-card-${i}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#20364D]">{cat.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{cat.product_count || 0} product{(cat.product_count || 0) !== 1 ? "s" : ""}</p>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 ${(cat.product_count || 0) > 0 ? "bg-emerald-500" : "bg-slate-300"}`} />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge className={`text-[9px] ${dm.color}`}>{dm.label}</Badge>
                  <Badge className={`text-[9px] ${cm.color}`}>{cm.label}</Badge>
                  <Badge className={`text-[9px] ${sm.color}`}>{sm.label}</Badge>
                </div>
              </div>
            );
          })}
          {categories.length === 0 && (
            <div className="col-span-3 text-center py-8 text-slate-400">
              <Tag className="w-8 h-8 mx-auto mb-2 text-slate-200" />
              <p>No categories configured</p>
            </div>
          )}
        </div>
      </div>

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
