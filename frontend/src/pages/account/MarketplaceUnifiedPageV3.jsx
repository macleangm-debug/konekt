import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Package, Palette, Search } from "lucide-react";
import api from "../../lib/api";
import ProductCardCompact from "../../components/marketplace/ProductCardCompact";
import ServiceCardGrid from "../../components/services/ServiceCardGrid";
import ServiceDetailShowcase from "../../components/services/ServiceDetailShowcase";
import ServiceQuoteRequestFormV2 from "../../components/services/ServiceQuoteRequestFormV2";

export default function MarketplaceUnifiedPageV3() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") || "products");
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    setLoading(true);
    const search = new URLSearchParams();
    if (searchQuery) search.set("q", searchQuery);
    api.get(`/api/marketplace/products/search?${search.toString()}`)
      .then((res) => setProducts(res.data || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [searchQuery]);

  useEffect(() => {
    setParams({ tab });
  }, [tab, setParams]);

  const switchTab = (newTab) => {
    setTab(newTab);
    setSelectedService(null);
  };

  return (
    <div className="space-y-6" data-testid="marketplace-unified">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#0f172a] tracking-tight">Marketplace</h1>
        <p className="text-sm text-[#64748b] mt-1">
          Products and services in one place. Each follows the right buying flow.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-4">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1" data-testid="marketplace-tabs">
          <button
            onClick={() => switchTab("products")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === "products" ? "bg-[#0f172a] text-white" : "text-[#64748b] hover:text-[#0f172a]"
            }`}
            data-testid="tab-products"
          >
            <Package className="w-4 h-4" />
            Products
          </button>
          <button
            onClick={() => switchTab("services")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === "services" ? "bg-[#0f172a] text-white" : "text-[#64748b] hover:text-[#0f172a]"
            }`}
            data-testid="tab-services"
          >
            <Palette className="w-4 h-4" />
            Services
          </button>
        </div>

        {/* Product Search (Products tab only) */}
        {tab === "products" && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1f3a5f] focus:border-transparent outline-none transition"
              data-testid="product-search"
            />
          </div>
        )}
      </div>

      {/* Content */}
      {tab === "products" ? (
        <>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-gray-100" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-4 bg-gray-100 rounded w-1/3 mt-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <p className="text-xs text-[#94a3b8]">{products.length} product{products.length !== 1 ? "s" : ""}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {products.map((product) => (
                  <ProductCardCompact key={product.id} product={product} />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
              <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <div className="text-sm text-[#64748b]">No products found</div>
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="mt-2 text-xs text-[#1f3a5f] underline">Clear search</button>
              )}
            </div>
          )}
        </>
      ) : selectedService ? (
        <ServiceDetailShowcase service={selectedService} onBack={() => setSelectedService(null)}>
          <ServiceQuoteRequestFormV2 service={selectedService} />
        </ServiceDetailShowcase>
      ) : (
        <ServiceCardGrid services={services} onOpen={setSelectedService} />
      )}
    </div>
  );
}
