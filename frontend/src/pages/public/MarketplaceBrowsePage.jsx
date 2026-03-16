import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import { getStoredCountryCode, getStoredRegion } from "../../lib/countryPreference";
import PublicNavbarV2 from "../../components/public/PublicNavbarV2";
import PremiumFooterV2 from "../../components/public/PremiumFooterV2";
import MarketplaceCardV2 from "../../components/public/MarketplaceCardV2";
import ListingGridSkeleton from "../../components/public/ListingGridSkeleton";
import PremiumEmptyState from "../../components/ui/PremiumEmptyState";
import { Search, Filter } from "lucide-react";

export default function MarketplaceBrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const countryCode = getStoredCountryCode();
  const region = getStoredRegion();

  const [items, setItems] = useState([]);
  const [facets, setFacets] = useState({ categories: [], listing_types: [], brands: [] });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: searchParams.get("category") || "",
    listing_type: searchParams.get("listing_type") || "",
    q: searchParams.get("q") || "",
  });

  const load = async () => {
    setLoading(true);
    try {
      // Try different API endpoints that might exist
      let itemsData = [];
      let facetsData = { categories: [], listing_types: [], brands: [] };

      // Try public marketplace search
      try {
        const searchRes = await api.get("/api/public-marketplace/search", {
          params: {
            country_code: countryCode,
            region,
            category: filters.category || undefined,
            listing_type: filters.listing_type || undefined,
            q: filters.q || undefined,
          },
        });
        itemsData = searchRes.data?.items || searchRes.data || [];
      } catch {
        // Fallback to country endpoint
        const countryRes = await api.get(`/api/public-marketplace/country/${countryCode}`);
        itemsData = countryRes.data?.items || countryRes.data || [];
      }

      // Try to get facets
      try {
        const facetsRes = await api.get(`/api/public-marketplace/categories/${countryCode}`);
        facetsData.categories = facetsRes.data?.categories || facetsRes.data || [];
      } catch {
        // Extract categories from items
        const cats = [...new Set(itemsData.map(i => i.category).filter(Boolean))];
        facetsData.categories = cats;
      }

      setItems(itemsData);
      setFacets(facetsData);
    } catch (error) {
      console.error("Failed to load marketplace:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (countryCode) load();
  }, [countryCode, region, filters.category, filters.listing_type]);

  const handleSearch = (e) => {
    e.preventDefault();
    load();
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    if (value) {
      searchParams.set(key, value);
    } else {
      searchParams.delete(key);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="bg-slate-50 min-h-screen" data-testid="marketplace-browse-page">
      <PublicNavbarV2 />
      
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-[#20364D]">Marketplace</h1>
          <p className="mt-2 text-slate-600">
            Discover products and services available in {countryCode || "your location"}.
          </p>
        </div>

        {/* Filters */}
        <form onSubmit={handleSearch} className="rounded-3xl border bg-white p-5">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                className="w-full border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]"
                placeholder="Search products and services..."
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                data-testid="search-input"
              />
            </div>
            <select
              className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]"
              value={filters.category}
              onChange={(e) => updateFilter("category", e.target.value)}
              data-testid="category-filter"
            >
              <option value="">All Categories</option>
              {facets.categories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <select
              className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]"
              value={filters.listing_type}
              onChange={(e) => updateFilter("listing_type", e.target.value)}
              data-testid="type-filter"
            >
              <option value="">All Types</option>
              <option value="product">Products</option>
              <option value="service">Services</option>
            </select>
          </div>
        </form>

        {/* Results */}
        {loading ? (
          <ListingGridSkeleton />
        ) : items.length > 0 ? (
          <>
            <div className="text-sm text-slate-500">
              {items.length} item{items.length !== 1 ? "s" : ""} found
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
              {items.map((item) => (
                <MarketplaceCardV2 key={item.id} item={item} />
              ))}
            </div>
          </>
        ) : (
          <PremiumEmptyState
            title="No listings found"
            description="Try another category, location, or search term to discover available products and services."
            ctaLabel="Clear filters"
            ctaHref="/marketplace"
          />
        )}
      </div>

      <PremiumFooterV2 />
    </div>
  );
}
