import React, { useState, useEffect, useRef } from "react";
import { Search, X, SlidersHorizontal, ArrowUpDown, ChevronDown } from "lucide-react";

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

  // ─── Active filter chips (shared) ─────────────
  const activeChips = [];
  if (filters.group_id) {
    const g = groups.find(x => x.id === filters.group_id);
    if (g) activeChips.push({ label: g.name, key: "group_id" });
  }
  if (filters.category_id) {
    const c = categories.find(x => x.id === filters.category_id);
    if (c) activeChips.push({ label: c.name, key: "category_id" });
  }
  if (filters.subcategory_id) {
    const s = subcategories.find(x => x.id === filters.subcategory_id);
    if (s) activeChips.push({ label: s.name, key: "subcategory_id" });
  }

  const removeChip = (key) => {
    const reset = { ...filters };
    if (key === "group_id") { reset.group_id = ""; reset.category_id = ""; reset.subcategory_id = ""; }
    if (key === "category_id") { reset.category_id = ""; reset.subcategory_id = ""; }
    if (key === "subcategory_id") { reset.subcategory_id = ""; }
    onChange(reset);
  };

  return (
    <>
      {/* ═══ DESKTOP FILTER RAIL (lg+) ═══ */}
      <div className="hidden lg:block" data-testid="marketplace-filter-rail">
        <DesktopFilterRail
          filters={filters}
          onChange={onChange}
          groups={groups}
          filteredCategories={filteredCategories}
          filteredSubcategories={filteredSubcategories}
          hasActiveFilters={hasActiveFilters}
          clearFilters={clearFilters}
          resultCount={resultCount}
        />
      </div>

      {/* ═══ MOBILE FILTER BAR + DRAWER (<lg) ═══ */}
      <div className="lg:hidden" data-testid="mobile-filter-bar">
        <MobileFilterBar
          filters={filters}
          onChange={onChange}
          groups={groups}
          categories={categories}
          subcategories={subcategories}
          filteredCategories={filteredCategories}
          filteredSubcategories={filteredSubcategories}
          hasActiveFilters={hasActiveFilters}
          clearFilters={clearFilters}
          resultCount={resultCount}
        />
      </div>

      {/* ═══ SELECTED FILTER CHIPS (both) ═══ */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2" data-testid="selected-filter-chips">
          {activeChips.map(chip => (
            <button
              key={chip.key}
              onClick={() => removeChip(chip.key)}
              className="flex items-center gap-1 rounded-full bg-[#20364D]/10 text-[#20364D] px-3 py-1 text-xs font-medium hover:bg-[#20364D]/20 transition"
              data-testid={`chip-${chip.key}`}
            >
              {chip.label} <X className="w-3 h-3" />
            </button>
          ))}
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-500 hover:bg-slate-50 transition"
            data-testid="clear-all-chips"
          >
            Clear all
          </button>
        </div>
      )}
    </>
  );
}


// ─── Desktop Inline Rail (unchanged layout) ────────────
function DesktopFilterRail({ filters, onChange, groups, filteredCategories, filteredSubcategories, hasActiveFilters, clearFilters, resultCount }) {
  return (
    <div className="space-y-3 rounded-2xl border bg-white p-4">
      <div className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_180px] gap-3">
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
        <select className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white" value={filters.group_id || ""}
          onChange={(e) => onChange({ ...filters, group_id: e.target.value, category_id: "", subcategory_id: "" })} data-testid="filter-group-select">
          <option value="">All Groups</option>
          {groups.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white" value={filters.category_id || ""}
          onChange={(e) => onChange({ ...filters, category_id: e.target.value, subcategory_id: "" })} data-testid="filter-category-select">
          <option value="">All Categories</option>
          {filteredCategories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white" value={filters.subcategory_id || ""}
          onChange={(e) => onChange({ ...filters, subcategory_id: e.target.value })} data-testid="filter-subcategory-select">
          <option value="">All Subcategories</option>
          {filteredSubcategories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white" value={filters.sort || "relevance"}
          onChange={(e) => onChange({ ...filters, sort: e.target.value })} data-testid="filter-sort-select">
          <option value="relevance">Sort: Relevance</option>
          <option value="newest">Newest</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
        </select>
      </div>
      <div className="flex items-center justify-between">
        <div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-slate-600 hover:bg-slate-50" data-testid="clear-filters-btn">
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>
        <div className="text-sm text-slate-500" data-testid="result-count">{resultCount} product{resultCount !== 1 ? "s" : ""} found</div>
      </div>
    </div>
  );
}


// ─── Mobile Filter Bar + Bottom Drawer ─────────────────
function MobileFilterBar({ filters, onChange, groups, filteredCategories, filteredSubcategories, hasActiveFilters, clearFilters, resultCount }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);

  // Close sort dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const sortLabels = { relevance: "Relevance", newest: "Newest", price_low: "Low → High", price_high: "High → Low" };
  const activeFilterCount = [filters.group_id, filters.category_id, filters.subcategory_id].filter(Boolean).length;

  return (
    <>
      {/* Compact search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#D4A843] outline-none"
          placeholder="Search products..."
          value={filters.q || ""}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
          data-testid="mobile-search-input"
        />
      </div>

      {/* Horizontal bar: Filter + Sort + Count */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDrawerOpen(true)}
          className={`flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition
            ${hasActiveFilters ? "bg-[#20364D] text-white border-[#20364D]" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
          data-testid="mobile-filter-btn"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filter
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-[#D4A843] text-[#17283C] text-xs font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Sort dropdown */}
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-slate-50 transition"
            data-testid="mobile-sort-btn"
          >
            <ArrowUpDown className="w-4 h-4" />
            {sortLabels[filters.sort] || "Sort"}
            <ChevronDown className={`w-3 h-3 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
          </button>
          {sortOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 w-44 rounded-xl bg-white border shadow-lg overflow-hidden" data-testid="mobile-sort-dropdown">
              {Object.entries(sortLabels).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => { onChange({ ...filters, sort: val }); setSortOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition
                    ${filters.sort === val ? "bg-[#20364D]/5 text-[#20364D] font-semibold" : "hover:bg-slate-50"}`}
                  data-testid={`mobile-sort-${val}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="ml-auto text-xs text-slate-500" data-testid="mobile-result-count">
          {resultCount} result{resultCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ═══ BOTTOM DRAWER — cascading "rainfall" step-by-step flow ═══ */}
      {drawerOpen && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setDrawerOpen(false)} />

          {/* Drawer */}
          <div
            className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200"
            data-testid="mobile-filter-drawer"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300" />
            </div>

            {(() => {
              // Figure out which step we're on
              const step = !filters.group_id ? 1 : !filters.category_id ? 2 : 3;
              const selectedGroup = groups.find((g) => g.id === filters.group_id);
              const selectedCategory = filteredCategories.find((c) => c.id === filters.category_id);
              const selectedSubcategory = filteredSubcategories.find((s) => s.id === filters.subcategory_id);

              const goBack = () => {
                if (step === 3) onChange({ ...filters, category_id: "", subcategory_id: "" });
                else if (step === 2) onChange({ ...filters, group_id: "", category_id: "", subcategory_id: "" });
              };

              return (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between py-3 px-5 border-b">
                    <div className="flex items-center gap-3">
                      {step > 1 && (
                        <button onClick={goBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-lg" data-testid="drawer-back-btn" aria-label="Back">
                          <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                        </button>
                      )}
                      <div>
                        <h3 className="text-base font-bold text-[#20364D]">
                          {step === 1 ? "Browse what?" : step === 2 ? "Category" : "Subcategory"}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Step {step} of 3</p>
                      </div>
                    </div>
                    <button onClick={() => setDrawerOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg" data-testid="close-drawer-btn">
                      <X className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>

                  {/* Breadcrumb — what's already chosen */}
                  {(selectedGroup || selectedCategory) && (
                    <div className="px-5 py-2 flex flex-wrap gap-1.5 border-b bg-slate-50 text-[11px]">
                      {selectedGroup && (
                        <span className="px-2 py-1 rounded-full bg-[#20364D] text-white font-semibold">{selectedGroup.name}</span>
                      )}
                      {selectedCategory && (
                        <>
                          <span className="text-slate-400">›</span>
                          <span className="px-2 py-1 rounded-full bg-amber-500 text-white font-semibold">{selectedCategory.name}</span>
                        </>
                      )}
                      {selectedSubcategory && (
                        <>
                          <span className="text-slate-400">›</span>
                          <span className="px-2 py-1 rounded-full bg-emerald-600 text-white font-semibold">{selectedSubcategory.name}</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Step body — big tappable list */}
                  <div className="overflow-y-auto flex-1 min-h-[280px] px-5 py-4">
                    {step === 1 && (
                      <div className="space-y-2" data-testid="drawer-step-groups">
                        <button
                          onClick={() => { onChange({ ...filters, group_id: "", category_id: "", subcategory_id: "" }); setDrawerOpen(false); }}
                          className={`w-full flex items-center justify-between px-4 py-4 rounded-xl border transition ${!filters.group_id ? "border-[#20364D] bg-[#20364D]/5" : "border-slate-200 hover:border-slate-300"}`}
                          data-testid="drawer-group-all"
                        >
                          <span className="font-semibold text-[#20364D]">Everything</span>
                          <span className="text-slate-400 text-sm">→</span>
                        </button>
                        {groups.map((g) => (
                          <button
                            key={g.id}
                            onClick={() => onChange({ ...filters, group_id: g.id, category_id: "", subcategory_id: "" })}
                            className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-slate-200 hover:border-[#20364D] hover:bg-[#20364D]/5 transition"
                            data-testid={`drawer-group-${g.id}`}
                          >
                            <span className="font-semibold text-[#20364D]">{g.name}</span>
                            <span className="text-slate-400 text-sm">→</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {step === 2 && (
                      <div className="space-y-2" data-testid="drawer-step-categories">
                        <button
                          onClick={() => { onChange({ ...filters, category_id: "__all__", subcategory_id: "" }); setDrawerOpen(false); }}
                          className="w-full flex items-center justify-between px-4 py-4 rounded-xl border-2 border-dashed border-[#20364D] bg-[#20364D]/5 hover:bg-[#20364D]/10 transition"
                          data-testid="drawer-category-all"
                        >
                          <div className="text-left">
                            <div className="font-bold text-[#20364D]">All {selectedGroup?.name}</div>
                            <div className="text-[11px] text-slate-500">Show everything under this group</div>
                          </div>
                          <span className="text-slate-400 text-sm">→</span>
                        </button>
                        {filteredCategories.length === 0 ? (
                          <div className="text-center text-sm text-slate-500 py-8">No categories here yet.</div>
                        ) : (
                          filteredCategories.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => onChange({ ...filters, category_id: c.id, subcategory_id: "" })}
                              className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-slate-200 hover:border-[#20364D] hover:bg-[#20364D]/5 transition"
                              data-testid={`drawer-category-${c.id}`}
                            >
                              <span className="font-semibold text-[#20364D]">{c.name}</span>
                              <span className="text-slate-400 text-sm">→</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    {step === 3 && (
                      <div className="space-y-2" data-testid="drawer-step-subcategories">
                        <button
                          onClick={() => { onChange({ ...filters, subcategory_id: "" }); setDrawerOpen(false); }}
                          className="w-full flex items-center justify-between px-4 py-4 rounded-xl border-2 border-dashed border-[#20364D] bg-[#20364D]/5 hover:bg-[#20364D]/10 transition"
                          data-testid="drawer-subcategory-all"
                        >
                          <div className="text-left">
                            <div className="font-bold text-[#20364D]">All {selectedCategory?.name}</div>
                            <div className="text-[11px] text-slate-500">Show everything under this category</div>
                          </div>
                          <span className="text-slate-400 text-sm">→</span>
                        </button>
                        {filteredSubcategories.length === 0 ? (
                          <div className="text-center text-sm text-slate-500 py-8">No subcategories here yet.</div>
                        ) : (
                          filteredSubcategories.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => { onChange({ ...filters, subcategory_id: s.id }); setDrawerOpen(false); }}
                              className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-slate-200 hover:border-[#20364D] hover:bg-[#20364D]/5 transition"
                              data-testid={`drawer-subcategory-${s.id}`}
                            >
                              <span className="font-semibold text-[#20364D]">{s.name}</span>
                              <span className="text-slate-400 text-sm">→</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer — persistent "Show results" CTA */}
                  <div className="flex gap-3 px-5 py-3 border-t bg-slate-50">
                    {hasActiveFilters && (
                      <button
                        onClick={() => { clearFilters(); setDrawerOpen(false); }}
                        className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                        data-testid="drawer-clear-btn"
                      >
                        Clear All
                      </button>
                    )}
                    <button
                      onClick={() => setDrawerOpen(false)}
                      className="flex-1 rounded-xl bg-[#20364D] text-white px-4 py-3 text-sm font-semibold hover:bg-[#2a4a66] transition"
                      data-testid="drawer-apply-btn"
                    >
                      Show Results ({resultCount})
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </>
      )}
    </>
  );
}
