import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import ListingGridSkeleton from "../../components/public/ListingGridSkeleton";
import PremiumEmptyState from "../../components/ui/PremiumEmptyState";
import PageHeader from "../../components/ui/PageHeader";
import FilterBar from "../../components/ui/FilterBar";
import { Package, FileText, ShoppingCart } from "lucide-react";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString()}`;
}

export default function MarketplaceBrowsePageContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState(searchParams.get("q") || "");
  const [groupFilter, setGroupFilter] = useState(searchParams.get("group") || "");

  const isLoggedIn = useMemo(
    () => Boolean(localStorage.getItem("konekt_token") || localStorage.getItem("token")),
    []
  );

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchValue) params.set("q", searchValue);
      if (groupFilter) params.set("group", groupFilter);

      // Single source of truth: /api/marketplace/products/search
      const res = await api.get(`/api/marketplace/products/search?${params.toString()}`);
      const prods = res.data || [];
      setItems(prods);
      const uniqueGroups = [...new Set(prods.map((p) => p.group_name).filter(Boolean))];
      setGroups(uniqueGroups);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [groupFilter]);

  const handleSearch = (value) => {
    setSearchValue(value);
    if (value) {
      searchParams.set("q", value);
    } else {
      searchParams.delete("q");
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleSearchSubmit = () => {
    load();
  };

  const updateGroupFilter = (value) => {
    setGroupFilter(value);
    if (value) {
      searchParams.set("group", value);
    } else {
      searchParams.delete("group");
    }
    setSearchParams(searchParams, { replace: true });
  };

  const requestProductQuote = (product) => {
    navigate(
      `/request-quote?type=product_bulk&service=${encodeURIComponent(product.name || "")}&category=${encodeURIComponent(product.category || product.group_name || "")}`
    );
  };

  const filterConfig = [
    {
      name: "group",
      value: groupFilter,
      onChange: updateGroupFilter,
      placeholder: "All Groups",
      options: groups.map((g) => ({ value: g, label: g })),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8" data-testid="marketplace-browse-content">
      <PageHeader
        title="Marketplace"
        subtitle="Discover products and services available for your business."
      />

      <FilterBar
        searchValue={searchValue}
        onSearchChange={handleSearch}
        onSearchSubmit={handleSearchSubmit}
        searchPlaceholder="Search products..."
        filters={filterConfig}
        className="mb-6"
      />

      {loading ? (
        <ListingGridSkeleton />
      ) : items.length > 0 ? (
        <>
          <div className="text-xs text-[#94a3b8] mb-3">
            {items.length} product{items.length !== 1 ? "s" : ""} found
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
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
