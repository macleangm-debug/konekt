import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Package, Palette, Megaphone, Search } from "lucide-react";
import api from "../../lib/api";
import ProductCardCompact from "../../components/marketplace/ProductCardCompact";
import ProductOrPromoDetailModal from "../../components/products/ProductOrPromoDetailModal";
import ServiceCardGrid from "../../components/services/ServiceCardGrid";
import ServiceDetailShowcase from "../../components/services/ServiceDetailShowcase";
import ServiceQuoteRequestFormV2 from "../../components/services/ServiceQuoteRequestFormV2";
import { useCartDrawer } from "../../contexts/CartDrawerContext";

const TABS = [
  { key: "products", label: "Products", icon: Package },
  { key: "services", label: "Services", icon: Palette },
  { key: "promo", label: "Promotional Materials", icon: Megaphone },
];

const PAGE_SIZE = 20;

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-slate-100" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-slate-100 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
        <div className="h-4 bg-slate-100 rounded w-1/3 mt-3" />
      </div>
    </div>
  );
}

export default function MarketplaceUnifiedPageV3() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") || "products");
  const [allProducts, setAllProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [detailItem, setDetailItem] = useState(null);
  const { addItem } = useCartDrawer();

  useEffect(() => {
    api.get("/api/service-request-templates").then((res) => {
      const rows = (res.data || []).map((x) => ({
        service_key: x.service_key,
        service_name: x.service_name,
        short_description: x.short_description || `Get a tailored quote for ${x.service_name}`,
        long_description: x.long_description,
        highlights: x.highlights,
      }));
      setServices(rows);
    }).catch(() => {});
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const search = new URLSearchParams();
      if (searchQuery) search.set("q", searchQuery);
      if (groupFilter) search.set("group", groupFilter);
      const res = await api.get(`/api/marketplace/products/search?${search.toString()}`);
      const prods = res.data || [];
      setAllProducts(prods);
      const uniqueGroups = [...new Set(prods.map((p) => p.group_name).filter(Boolean))];
      setGroups(uniqueGroups);
    } catch {
      setAllProducts([]);
    }
    setLoading(false);
  }, [searchQuery, groupFilter]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    setParams({ tab });
    setVisibleCount(PAGE_SIZE);
  }, [tab, setParams]);

  const switchTab = (newTab) => {
    setTab(newTab);
    setSelectedService(null);
    setSearchQuery("");
    setGroupFilter("");
  };

  const isPromo = tab === "promo";
  const filteredProducts = allProducts.filter((p) => {
    if (isPromo) return (p.category || "").toLowerCase().includes("promot") || (p.group_name || "").toLowerCase().includes("promot");
    return true;
  });
  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  const searchPlaceholder = tab === "products"
    ? "Search by product, group, or subgroup"
    : tab === "services"
    ? "Search services by name or category"
    : "Search promotional materials";

  return (
    <div className="space-y-6" data-testid="marketplace-unified">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#20364D] tracking-tight">Marketplace</h1>
        <p className="text-sm text-slate-500 mt-1">
          Products, services, and promotional materials — each follows the right buying flow.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1" data-testid="marketplace-tabs">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            data-testid={`tab-${key}`}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? "bg-[#20364D] text-white shadow-sm" : "text-[#20364D] hover:bg-slate-50"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Search & Filter */}
      {(tab === "products" || tab === "promo") && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4" data-testid="marketplace-search">
          <div className="grid md:grid-cols-[1fr_auto] gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none"
                data-testid="product-search"
              />
            </div>
            {groups.length > 0 && (
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white text-[#20364D] min-w-[180px]"
                data-testid="group-filter"
              >
                <option value="">All Groups</option>
                {groups.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            )}
          </div>
        </div>
      )}

      {/* Products Content */}
      {(tab === "products" || tab === "promo") && (
        <>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : visibleProducts.length > 0 ? (
            <>
              <p className="text-xs text-slate-400">{filteredProducts.length} {tab === "promo" ? "promotional item" : "product"}{filteredProducts.length !== 1 ? "s" : ""}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {visibleProducts.map((product) => (
                  <ProductCardCompact key={product.id} product={product} onDetail={setDetailItem} />
                ))}
              </div>
              {hasMore && (
                <div className="text-center pt-2">
                  <button
                    data-testid="load-more-btn"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="rounded-xl border border-slate-200 px-6 py-3 font-semibold text-[#20364D] hover:bg-slate-50 transition-colors"
                  >
                    Load More ({filteredProducts.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">{tab === "promo" ? "No promotional materials found" : "No products found"}</p>
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="mt-2 text-xs text-[#20364D] underline">Clear search</button>
              )}
            </div>
          )}
        </>
      )}

      {/* Services Content */}
      {tab === "services" && (
        selectedService ? (
          <ServiceDetailShowcase service={selectedService} onBack={() => setSelectedService(null)}>
            <ServiceQuoteRequestFormV2 service={selectedService} />
          </ServiceDetailShowcase>
        ) : (
          <ServiceCardGrid services={services} onOpen={setSelectedService} />
        )
      )}

      {/* Product Detail Modal */}
      <ProductOrPromoDetailModal
        item={detailItem}
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        onAddToCart={(item) => addItem({ ...item, price: item.base_price || item.price, quantity: 1 })}
      />
    </div>
  );
}
