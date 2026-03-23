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
    <div className={`rounded-xl border border-gray-200 bg-white p-4 ${className}`} data-testid="filter-bar">
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1f3a5f] focus:border-transparent transition"
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
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1f3a5f] focus:border-transparent min-w-[150px] transition"
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
