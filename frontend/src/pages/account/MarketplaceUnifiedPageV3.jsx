import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Package, Megaphone, Wrench } from "lucide-react";
import api from "../../lib/api";
import ProductCardCompact from "../../components/marketplace/ProductCardCompact";
import ProductPromoDetailModalV2 from "../../components/products/ProductPromoDetailModalV2";
import ServiceCardGrid from "../../components/services/ServiceCardGrid";
import ServiceDetailShowcase from "../../components/services/ServiceDetailShowcase";
import ServiceQuoteRequestFormV2 from "../../components/services/ServiceQuoteRequestFormV2";
import MultiPromoCustomizationBuilder from "../../components/promotions/MultiPromoCustomizationBuilder";
import PromoMultiBlankBuilder from "../../components/requests/PromoMultiBlankBuilder";
import MultiServiceRequestBuilder from "../../components/services/MultiServiceRequestBuilder";
import InlineMarketplaceFilterRail from "../../components/marketplace/InlineMarketplaceFilterRail";
import CantFindWhatYouNeedBanner from "../../components/public/CantFindWhatYouNeedBanner";
import { getAllServicesForGrid } from "../../data/comprehensiveServiceData";
import { useAuth } from "../../contexts/AuthContext";

const TABS = [
  { key: "products", label: "Products", icon: Package },
  { key: "promo", label: "Promotional Materials", icon: Megaphone },
  { key: "services", label: "Services", icon: Wrench },
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
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [detailItem, setDetailItem] = useState(null);
  const { user } = useAuth();
  const [showPromoBuilder, setShowPromoBuilder] = useState(false);
  const [showServiceBuilder, setShowServiceBuilder] = useState(false);
  const [taxonomy, setTaxonomy] = useState({ groups: [], categories: [], subcategories: [] });
  const [inlineFilters, setInlineFilters] = useState({ q: "", group_id: "", category_id: "", subcategory_id: "", sort: "relevance" });

  useEffect(() => {
    const staticServices = getAllServicesForGrid();
    api.get("/api/service-request-templates").then((res) => {
      const apiRows = (res.data || []).map((x) => ({
        service_key: x.service_key,
        service_name: x.service_name,
        short_description: x.short_description || `Get a tailored quote for ${x.service_name}`,
        long_description: x.long_description,
        highlights: x.highlights,
      }));
      // Merge: API data takes priority, then fill from static catalog
      const apiKeys = new Set(apiRows.map((r) => r.service_key));
      const merged = [...apiRows, ...staticServices.filter((s) => !apiKeys.has(s.service_key))];
      setServices(merged);
    }).catch(() => {
      setServices(staticServices);
    });

    api.get("/api/marketplace/taxonomy")
      .then((res) => setTaxonomy(res.data || { groups: [], categories: [], subcategories: [] }))
      .catch(() => {});
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const search = new URLSearchParams();
      if (inlineFilters.q) search.set("q", inlineFilters.q);
      if (inlineFilters.group_id) search.set("group_id", inlineFilters.group_id);
      if (inlineFilters.category_id) search.set("category_id", inlineFilters.category_id);
      if (inlineFilters.subcategory_id) search.set("subcategory_id", inlineFilters.subcategory_id);
      const res = await api.get(`/api/marketplace/products/search?${search.toString()}`);
      let prods = res.data || [];
      if (inlineFilters.sort === "newest") prods.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
      if (inlineFilters.sort === "price_low") prods.sort((a, b) => (a.customer_price || a.price || 0) - (b.customer_price || b.price || 0));
      if (inlineFilters.sort === "price_high") prods.sort((a, b) => (b.customer_price || b.price || 0) - (a.customer_price || a.price || 0));
      setAllProducts(prods);
      const uniqueGroups = [...new Set(prods.map((p) => p.group_name).filter(Boolean))];
      setGroups(uniqueGroups);
    } catch {
      setAllProducts([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [inlineFilters]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { setParams({ tab }, { replace: true }); setVisibleCount(PAGE_SIZE); }, [tab, setParams]);

  const filteredProducts = allProducts.filter((product) => {
    const isPromo = `${product.group_name || product.category_name || ""}`.toLowerCase().includes("promo")
      || `${product.group_name || ""}`.toLowerCase().includes("branding");
    if (tab === "promo") return isPromo;
    if (tab === "products") return !isPromo;
    return true;
  });

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  return (
    <div className="space-y-6" data-testid="marketplace-unified-page-v3">
      <div className="rounded-2xl border border-slate-200 bg-white p-2 flex flex-wrap gap-2" data-testid="marketplace-tabs">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setSelectedService(null); }}
            data-testid={`tab-${key}`}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors ${
              tab === key ? "bg-[#20364D] text-white" : "text-[#20364D] hover:bg-slate-50"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {(tab === "products" || tab === "promo") && (
        <InlineMarketplaceFilterRail
          filters={inlineFilters}
          onChange={setInlineFilters}
          groups={taxonomy.groups}
          categories={taxonomy.categories}
          subcategories={taxonomy.subcategories}
          resultCount={filteredProducts.length}
        />
      )}

      {(tab === "products" || tab === "promo") && (
        <>
          {tab === "promo" && (
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => { setShowPromoBuilder(!showPromoBuilder); }} data-testid="toggle-promo-builder"
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${showPromoBuilder ? "bg-[#20364D] text-white" : "border border-slate-200 text-[#20364D] hover:bg-slate-50"}`}>
                {showPromoBuilder ? "Browse Promotional Materials" : "Build Custom Promo Request"}
              </button>
            </div>
          )}

          {tab === "promo" && showPromoBuilder ? (
            <PromoMultiBlankBuilder onSubmitted={() => setShowPromoBuilder(false)} />
          ) : tab === "promo" || tab === "products" ? (
            <>
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : visibleProducts.length > 0 ? (
                <>
                  <p className="text-xs text-slate-400">{filteredProducts.length} {tab === "promo" ? "promotional item" : "product"}{filteredProducts.length !== 1 ? "s" : ""}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {visibleProducts.map((product) => (
                      <ProductCardCompact key={product.id} product={product} onDetail={setDetailItem} isPromo={tab === "promo"} />
                    ))}
                  </div>
                  {hasMore && (
                    <div className="text-center pt-2">
                      <button data-testid="load-more-btn" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} className="rounded-xl border border-slate-200 px-6 py-3 font-semibold text-[#20364D] hover:bg-slate-50 transition-colors">
                        Load More ({filteredProducts.length - visibleCount} remaining)
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
                  <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">{tab === "promo" ? "No promotional materials found" : "No products found"}</p>
                </div>
              )}
            </>
          ) : null}
        </>
      )}

      {tab === "services" && (
        showServiceBuilder ? (
          <MultiServiceRequestBuilder customerId={user?.id || "guest"} onSubmitted={() => setShowServiceBuilder(false)} />
        ) : selectedService ? (
          <ServiceDetailShowcase service={selectedService} onBack={() => setSelectedService(null)}>
            <ServiceQuoteRequestFormV2 service={selectedService} />
          </ServiceDetailShowcase>
        ) : (
          <div className="space-y-4">
            <button onClick={() => setShowServiceBuilder(true)} data-testid="toggle-service-builder" className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-[#20364D] hover:bg-slate-50 transition-colors">
              Build Service Request
            </button>
            <ServiceCardGrid services={services} onOpen={setSelectedService} />
          </div>
        )
      )}

      <ProductPromoDetailModalV2 item={detailItem} open={!!detailItem} onClose={() => setDetailItem(null)} isPromo={tab === "promo"} />

      <CantFindWhatYouNeedBanner className="mt-4" />
    </div>
  );
}
