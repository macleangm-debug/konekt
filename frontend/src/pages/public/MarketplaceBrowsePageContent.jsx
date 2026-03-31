import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import ListingGridSkeleton from "../../components/public/ListingGridSkeleton";
import PremiumEmptyState from "../../components/ui/PremiumEmptyState";
import MarketplaceFilterSidebar from "../../components/marketplace/MarketplaceFilterSidebar";
import { Package, FileText, ShoppingCart, Search } from "lucide-react";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString()}`;
}

export default function MarketplaceBrowsePageContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState(searchParams.get("q") || "");

  // Taxonomy data
  const [taxonomy, setTaxonomy] = useState({ groups: [], categories: [], subcategories: [] });
  const [filters, setFilters] = useState({
    group_id: searchParams.get("group_id") || null,
    category_id: searchParams.get("category_id") || null,
    subcategory_id: searchParams.get("subcategory_id") || null,
  });

  const isLoggedIn = useMemo(
    () => Boolean(localStorage.getItem("konekt_token") || localStorage.getItem("token")),
    []
  );

  // Load taxonomy once
  useEffect(() => {
    api.get("/api/marketplace/taxonomy")
      .then((res) => setTaxonomy(res.data || { groups: [], categories: [], subcategories: [] }))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchValue) params.set("q", searchValue);
      if (filters.group_id) params.set("group_id", filters.group_id);
      if (filters.category_id) params.set("category_id", filters.category_id);
      if (filters.subcategory_id) params.set("subcategory_id", filters.subcategory_id);

      const res = await api.get(`/api/marketplace/products/search?${params.toString()}`);
      setItems(res.data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [searchValue, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    const params = new URLSearchParams();
    if (searchValue) params.set("q", searchValue);
    if (newFilters.group_id) params.set("group_id", newFilters.group_id);
    if (newFilters.category_id) params.set("category_id", newFilters.category_id);
    if (newFilters.subcategory_id) params.set("subcategory_id", newFilters.subcategory_id);
    setSearchParams(params, { replace: true });
  };

  const requestProductQuote = (product) => {
    navigate(
      `/request-quote?type=product_bulk&service=${encodeURIComponent(product.name || "")}&category=${encodeURIComponent(product.category || product.group_name || "")}`
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8" data-testid="marketplace-browse-content">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#20364D]">Marketplace</h1>
        <p className="text-slate-600 mt-1">Discover products and services available for your business.</p>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none"
            data-testid="search-products-input"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6">
        {/* Sidebar */}
        <MarketplaceFilterSidebar
          groups={taxonomy.groups}
          categories={taxonomy.categories}
          subcategories={taxonomy.subcategories}
          selectedFilters={filters}
          onChange={handleFilterChange}
        />

        {/* Products */}
        <section>
          {loading ? (
            <ListingGridSkeleton />
          ) : items.length > 0 ? (
            <>
              <div className="text-xs text-slate-400 mb-3">
                {items.length} product{items.length !== 1 ? "s" : ""} found
              </div>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((item) => (
                  <MarketplaceProductCard
                    key={item.id}
                    product={item}
                    isLoggedIn={isLoggedIn}
                    onRequestQuote={requestProductQuote}
                  />
                ))}
              </div>
            </>
          ) : (
            <PremiumEmptyState
              title="No products found"
              description="Try another search term or clear filters to browse all products."
              ctaLabel="Clear filters"
              ctaHref="/marketplace"
            />
          )}
        </section>
      </div>
    </div>
  );
}

function MarketplaceProductCard({ product, isLoggedIn, onRequestQuote }) {
  const price =
    product?.customer_price ??
    product?.price ??
    product?.base_price ??
    product?.unit_price ??
    0;

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
      data-testid={`marketplace-card-${product.id}`}
    >
      <Link to={`/marketplace/${product.slug || product.id}`} className="block">
        <div className="h-44 bg-[#f8fafc] overflow-hidden flex items-center justify-center">
          {product.image_url || product.images?.[0] || product.hero_image ? (
            <img
              src={product.image_url || product.images?.[0] || product.hero_image}
              alt={product.name || "Product"}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-300"
            />
          ) : (
            <Package className="w-10 h-10 text-gray-300" />
          )}
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-[#20364D]/10 text-[#20364D]">
            {product.category || product.group_name || "General"}
          </span>
        </div>

        <Link to={`/marketplace/${product.slug || product.id}`}>
          <h3 className="text-sm font-semibold text-[#0f172a] line-clamp-2 mb-1 hover:underline">
            {product.name}
          </h3>
        </Link>

        <p className="text-xs text-[#64748b] line-clamp-2 min-h-[32px]">
          {product.short_description || product.description || ""}
        </p>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <span className="font-semibold text-[#0f172a] text-sm">{money(price)}</span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onRequestQuote(product)}
              className="rounded-lg border border-slate-200 text-[#20364D] px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1"
              data-testid={`request-quote-${product.id}`}
            >
              <FileText className="w-3 h-3" /> Quote
            </button>

            {isLoggedIn && (
              <Link
                to={`/account/marketplace/${product.id || product.slug}`}
                className="rounded-lg bg-[#0f172a] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#1e293b] transition-colors flex items-center gap-1"
                data-testid={`view-product-${product.id}`}
              >
                <ShoppingCart className="w-3 h-3" /> Order
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
