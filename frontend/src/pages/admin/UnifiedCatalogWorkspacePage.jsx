import React, { useEffect, useState } from "react";
import { Package, Wrench, Tag, Truck, RefreshCw, FileText, LayoutGrid } from "lucide-react";
import { Button } from "../../components/ui/button";
import api from "../../lib/api";

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "products", label: "Products", icon: Package },
  { key: "services", label: "Services", icon: Wrench },
  { key: "taxonomy", label: "Taxonomy", icon: Tag },
  { key: "supply", label: "Vendor Supply", icon: Truck },
];

export default function UnifiedCatalogWorkspacePage() {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/admin/catalog-workspace/stats")
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    { label: "Products", count: stats.products, icon: Package, color: "text-blue-600 bg-blue-50 border-blue-200" },
    { label: "Services", count: stats.services, icon: Wrench, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    { label: "Categories", count: stats.taxonomy_categories, icon: Tag, color: "text-purple-600 bg-purple-50 border-purple-200" },
    { label: "Supply Records", count: stats.vendor_supply_records, icon: Truck, color: "text-orange-600 bg-orange-50 border-orange-200" },
    { label: "Pending Reviews", count: stats.pending_submissions, icon: FileText, color: "text-amber-600 bg-amber-50 border-amber-200" },
  ] : [];

  return (
    <div className="space-y-5" data-testid="catalog-workspace-page">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Catalog Workspace</h1>
        <Button variant="outline" size="sm" onClick={() => { setLoading(true); api.get("/api/admin/catalog-workspace/stats").then(r => setStats(r.data)).finally(() => setLoading(false)); }} data-testid="refresh-catalog-btn">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" data-testid="catalog-tabs">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
              data-testid={`tab-${t.key}`}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="space-y-4" data-testid="catalog-overview">
          {loading ? (
            <div className="text-sm text-slate-500 p-4">Loading catalog stats...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className={`rounded-xl border p-4 ${card.color}`} data-testid={`stat-${card.label.toLowerCase().replace(/\s/g, "-")}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-medium">{card.label}</span>
                    </div>
                    <div className="text-2xl font-bold">{card.count}</div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-600">
            <p>Use the tabs above to manage your catalog. Products and Services are separated by type. Taxonomy defines the category structure. Vendor Supply tracks pre-allocated stock.</p>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {tab === "products" && (
        <div className="rounded-lg border bg-white p-6 text-center" data-testid="catalog-products-tab">
          <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-600 mb-3">Manage products from the dedicated Products & Services page.</p>
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/admin/products-services"} data-testid="go-to-products">
            Open Products & Services
          </Button>
        </div>
      )}

      {/* Services Tab */}
      {tab === "services" && (
        <div className="rounded-lg border bg-white p-6 text-center" data-testid="catalog-services-tab">
          <Wrench className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-600 mb-3">Service catalog management.</p>
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/admin/products-services"} data-testid="go-to-services">
            Open Products & Services
          </Button>
        </div>
      )}

      {/* Taxonomy Tab */}
      {tab === "taxonomy" && (
        <div className="rounded-lg border bg-white p-6 text-center" data-testid="catalog-taxonomy-tab">
          <Tag className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-600 mb-3">Manage categories and taxonomy structure.</p>
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/admin/taxonomy"} data-testid="go-to-taxonomy">
            Open Taxonomy
          </Button>
        </div>
      )}

      {/* Supply Tab */}
      {tab === "supply" && (
        <div className="rounded-lg border bg-white p-6 text-center" data-testid="catalog-supply-tab">
          <Truck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-600 mb-3">Vendor supply records are managed per-vendor from the Vendor detail page.</p>
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/admin/vendors"} data-testid="go-to-vendors">
            Open Vendors
          </Button>
        </div>
      )}
    </div>
  );
}
