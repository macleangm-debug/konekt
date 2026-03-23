import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../../lib/api";
import { getStoredCountryCode, getStoredRegion } from "../../lib/countryPreference";
import MarketplaceCardV2 from "../../components/public/MarketplaceCardV2";
import ListingGridSkeleton from "../../components/public/ListingGridSkeleton";
import PremiumEmptyState from "../../components/ui/PremiumEmptyState";
import PageHeader from "../../components/ui/PageHeader";
import FilterBar from "../../components/ui/FilterBar";

export default function MarketplaceBrowsePageContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const countryCode = getStoredCountryCode();
  const region = getStoredRegion();

  const [items, setItems] = useState([]);
  const [facets, setFacets] = useState({ categories: [], listing_types: [], brands: [] });
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState(searchParams.get("q") || "");
  const [filters, setFilters] = useState({
    category: searchParams.get("category") || "",
    listing_type: searchParams.get("listing_type") || "",
  });

  const load = async () => {
    setLoading(true);
    try {
      let itemsData = [];
      let facetsData = { categories: [], listing_types: [], brands: [] };

      try {
        const searchRes = await api.get("/api/public-marketplace/search", {
          params: {
            country_code: countryCode,
            region,
            category: filters.category || undefined,
            listing_type: filters.listing_type || undefined,
            q: searchValue || undefined,
          },
        });
        itemsData = searchRes.data?.items || searchRes.data || [];
      } catch {
        const countryRes = await api.get(`/api/public-marketplace/country/${countryCode}`);
        itemsData = countryRes.data?.items || countryRes.data || [];
      }

      try {
        const facetsRes = await api.get(`/api/public-marketplace/categories/${countryCode}`);
        facetsData.categories = facetsRes.data?.categories || facetsRes.data || [];
      } catch {
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

  const handleSearch = (value) => {
    setSearchValue(value);
    if (value) {
      searchParams.set("q", value);
    } else {
      searchParams.delete("q");
    }
    setSearchParams(searchParams);
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

  const filterConfig = [
    {
      name: "category",
      value: filters.category,
      onChange: (v) => updateFilter("category", v),
      placeholder: "All Categories",
      options: facets.categories.map(c => ({ value: c, label: c })),
    },
    {
      name: "type",
      value: filters.listing_type,
      onChange: (v) => updateFilter("listing_type", v),
      placeholder: "All Types",
      options: [
        { value: "product", label: "Products" },
        { value: "service", label: "Services" },
      ],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8" data-testid="marketplace-browse-content">
      <PageHeader 
        title="Marketplace"
        subtitle={`Discover products and services available in ${countryCode || "your location"}.`}
      />

      <FilterBar
        searchValue={searchValue}
        onSearchChange={handleSearch}
        searchPlaceholder="Search products and services..."
        filters={filterConfig}
        className="mb-6"
      />

      {loading ? (
        <ListingGridSkeleton />
      ) : items.length > 0 ? (
        <>
          <div className="text-xs text-[#94a3b8] mb-3">
            {items.length} item{items.length !== 1 ? "s" : ""} found
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
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
  );
}
