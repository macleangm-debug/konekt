import React from "react";
import { Search, X } from "lucide-react";

export default function InlineMarketplaceFilterRail({
  filters,
  onChange,
  groups = [],
  categories = [],
  subcategories = [],
  resultCount = 0,
}) {
  const filteredCategories = filters.group_id
    ? categories.filter((c) => c.group_id === filters.group_id)
    : categories;
  const filteredSubcategories = filters.category_id
    ? subcategories.filter((s) => s.category_id === filters.category_id)
    : subcategories;

  const hasActiveFilters = filters.group_id || filters.category_id || filters.subcategory_id;

  const clearFilters = () => {
    onChange({ q: filters.q || "", group_id: "", category_id: "", subcategory_id: "", sort: filters.sort || "relevance" });
  };

  return (
    <div className="space-y-3 rounded-2xl border bg-white p-4" data-testid="marketplace-filter-rail">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#D4A843] outline-none"
            placeholder="Search products..."
            value={filters.q || ""}
            onChange={(e) => onChange({ ...filters, q: e.target.value })}
            data-testid="filter-search-input"
          />
        </div>

        <select
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white"
          value={filters.group_id || ""}
          onChange={(e) => onChange({ ...filters, group_id: e.target.value, category_id: "", subcategory_id: "" })}
          data-testid="filter-group-select"
        >
          <option value="">All Groups</option>
          {groups.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>

        <select
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white"
          value={filters.category_id || ""}
          onChange={(e) => onChange({ ...filters, category_id: e.target.value, subcategory_id: "" })}
          data-testid="filter-category-select"
        >
          <option value="">All Categories</option>
          {filteredCategories.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>

        <select
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white"
          value={filters.subcategory_id || ""}
          onChange={(e) => onChange({ ...filters, subcategory_id: e.target.value })}
          data-testid="filter-subcategory-select"
        >
          <option value="">All Subcategories</option>
          {filteredSubcategories.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>

        <select
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white"
          value={filters.sort || "relevance"}
          onChange={(e) => onChange({ ...filters, sort: e.target.value })}
          data-testid="filter-sort-select"
        >
          <option value="relevance">Sort: Relevance</option>
          <option value="newest">Newest</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
              data-testid="clear-filters-btn"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>
        <div className="text-sm text-slate-500" data-testid="result-count">{resultCount} product{resultCount !== 1 ? "s" : ""} found</div>
      </div>
    </div>
  );
}
