import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Package, Search, Tag, ArrowRight, Users } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "../../contexts/CartContext";
import api from "../../lib/api";
import ListingGridSkeleton from "../../components/public/ListingGridSkeleton";
import PremiumEmptyState from "../../components/ui/PremiumEmptyState";
import InlineMarketplaceFilterRail from "../../components/marketplace/InlineMarketplaceFilterRail";
import CantFindWhatYouNeedBanner from "../../components/public/CantFindWhatYouNeedBanner";
import ServiceCardsSection from "../../components/marketplace/ServiceCardsSection";
import ProductCardCompact from "../../components/marketplace/ProductCardCompact";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString()}`;
}

export default function MarketplaceBrowsePageContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dealCount, setDealCount] = useState(0);

  // Check for active group deals
  useEffect(() => {
    api.get("/api/public/group-deals/featured")
      .then((r) => setDealCount((r.data || []).length))
      .catch(() => {});
  }, []);

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

      {/* Group Deals Entry Point */}
      {dealCount > 0 && (
        <Link to="/group-deals" className="block mb-6 rounded-2xl bg-gradient-to-r from-[#0E1A2B] to-[#1a2d45] text-white p-4 md:p-5 hover:shadow-lg transition-all group" data-testid="marketplace-group-deals-banner">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#D4A843]/20 flex items-center justify-center flex-shrink-0">
              <Tag className="w-6 h-6 text-[#D4A843]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">Group Deals</h3>
                <span className="text-[10px] font-bold bg-[#D4A843] text-[#17283C] px-2 py-0.5 rounded-full">{dealCount} active</span>
              </div>
              <p className="text-sm text-slate-300 mt-0.5">Join other buyers for volume discounts — save more together</p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-[#D4A843] group-hover:gap-2.5 transition-all flex-shrink-0">
              View Deals <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>
      )}

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
              <ProductCardCompact
                key={item.id}
                product={item}
                onDetail={(p) => navigate(`/marketplace/${p.slug || p.id}`)}
                onAddToCart={(p, price, originalPrice) => {
                  addItem({
                    product_id: p.id,
                    product_name: p.name,
                    quantity: 1,
                    unit_price: price,
                    original_price: originalPrice,
                    subtotal: price,
                    listing_type: p.listing_type || "product",
                    image_url: p.image_url || p.images?.[0] || p.hero_image || "",
                    category: p.category || p.group_name || "",
                    promo_applied: !!p.promotion,
                    promo_id: p.promotion?.promo_id || null,
                    promo_label: p.promotion?.discount_label || null,
                    promo_discount: p.promotion?.discount_amount || 0,
                  });
                  toast.success(`${p.name} added to cart`);
                }}
                onRequestQuote={(p) => requestProductQuote(p)}
              />
            ))}
          </div>
        ) : (
          !filters.group_id && !filters.category_id && !filters.q ? null : (
            <PremiumEmptyState
              title="No product listings found"
              description="Try another search term or clear filters. Check the service cards below for available services."
              ctaLabel="Clear filters"
              ctaHref="/marketplace"
            />
          )
        )}
      </section>

      <ServiceCardsSection />
      <CantFindWhatYouNeedBanner className="mt-8" />
    </div>
  );
}
