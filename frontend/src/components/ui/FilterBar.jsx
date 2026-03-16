import React from "react";
import { Search, Filter } from "lucide-react";

export default function FilterBar({ 
  searchValue, 
  onSearchChange, 
  searchPlaceholder = "Search...",
  filters = [],
  actions,
  className = ""
}) {
  return (
    <div className={`rounded-3xl border bg-white p-4 ${className}`} data-testid="filter-bar">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]"
            data-testid="filter-search"
          />
        </div>

        {/* Filter Dropdowns */}
        {filters.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {filters.map((filter, idx) => (
              <select
                key={idx}
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D] min-w-[150px]"
                data-testid={`filter-${filter.name}`}
              >
                <option value="">{filter.placeholder}</option>
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ))}
          </div>
        )}

        {/* Actions */}
        {actions && <div className="flex gap-3">{actions}</div>}
      </div>
    </div>
  );
}
