import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Package, FileText, ShoppingCart, Search } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "../../contexts/CartContext";
import api from "../../lib/api";
import ListingGridSkeleton from "../../components/public/ListingGridSkeleton";
import PremiumEmptyState from "../../components/ui/PremiumEmptyState";
import InlineMarketplaceFilterRail from "../../components/marketplace/InlineMarketplaceFilterRail";
import CantFindWhatYouNeedBanner from "../../components/public/CantFindWhatYouNeedBanner";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString()}`;
}

export default function MarketplaceBrowsePageContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Taxonomy data
  const [taxonomy, setTaxonomy] = useState({ groups: [], categories: [], subcategories: [] });
  const [filters, setFilters] = useState({
    q: searchParams.get("q") || "",
    group_id: searchParams.get("group_id") || "",
    category_id: searchParams.get("category_id") || "",
    subcategory_id: searchParams.get("subcategory_id") || "",
    sort: searchParams.get("sort") || "relevance",
  });

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
      if (filters.q) params.set("q", filters.q);
      if (filters.group_id) params.set("group_id", filters.group_id);
      if (filters.category_id) params.set("category_id", filters.category_id);
      if (filters.subcategory_id) params.set("subcategory_id", filters.subcategory_id);

      const res = await api.get(`/api/marketplace/products/search?${params.toString()}`);
      let results = res.data || [];
      // Client-side sort
      if (filters.sort === "newest") results.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
      if (filters.sort === "price_low") results.sort((a, b) => (a.customer_price || a.price || 0) - (b.customer_price || b.price || 0));
      if (filters.sort === "price_high") results.sort((a, b) => (b.customer_price || b.price || 0) - (a.customer_price || a.price || 0));
      setItems(results);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    const params = new URLSearchParams();
    if (newFilters.q) params.set("q", newFilters.q);
    if (newFilters.group_id) params.set("group_id", newFilters.group_id);
    if (newFilters.category_id) params.set("category_id", newFilters.category_id);
    if (newFilters.subcategory_id) params.set("subcategory_id", newFilters.subcategory_id);
    if (newFilters.sort && newFilters.sort !== "relevance") params.set("sort", newFilters.sort);
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
        <p className="text-slate-600 mt-1">Browse products, promotional materials, and services available for your business.</p>
      </div>

      {/* Inline Filter Rail */}
      <InlineMarketplaceFilterRail
        filters={filters}
        onChange={handleFilterChange}
        groups={taxonomy.groups}
        categories={taxonomy.categories}
        subcategories={taxonomy.subcategories}
        resultCount={items.length}
      />

      {/* Products — 4-card desktop grid */}
      <section className="mt-6">
        {loading ? (
          <ListingGridSkeleton />
        ) : items.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="marketplace-grid">
            {items.map((item) => (
              <MarketplaceProductCard
                key={item.id}
                product={item}
                onRequestQuote={requestProductQuote}
              />
            ))}
          </div>
        ) : (
          <PremiumEmptyState
            title="No listings found"
            description="Try another search term or clear filters to browse all products, promotional materials, and services."
            ctaLabel="Clear filters"
            ctaHref="/marketplace"
          />
        )}
      </section>

      <CantFindWhatYouNeedBanner className="mt-8" />
    </div>
  );
}

function MarketplaceProductCard({ product, onRequestQuote }) {
  const { addItem } = useCart();
  const price =
    product?.customer_price ??
    product?.price ??
    product?.base_price ??
    product?.unit_price ??
    0;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      unit_price: Number(price),
      subtotal: Number(price),
      size: null,
      color: null,
      print_method: null,
      listing_type: product.listing_type || "product",
      image_url: product.image_url || product.images?.[0] || product.hero_image || "",
      category: product.category || product.group_name || "",
    });
    toast.success(`${product.name} added to cart`);
  };

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

            <button
              onClick={handleAddToCart}
              className="rounded-lg bg-[#0f172a] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#1e293b] transition-colors flex items-center gap-1"
              data-testid={`add-to-cart-${product.id}`}
            >
              <ShoppingCart className="w-3 h-3" /> Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
