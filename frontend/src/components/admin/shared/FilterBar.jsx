import React from "react";
import { Search, Filter } from "lucide-react";

export default function FilterBar({ search, onSearchChange, filters = [], children }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6" data-testid="filter-bar">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none bg-white"
          placeholder="Search..."
          value={search || ""}
          onChange={(e) => onSearchChange?.(e.target.value)}
          data-testid="filter-search"
        />
      </div>
      {filters.map((f) => (
        <select key={f.key} className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#20364D]/20 outline-none bg-white min-w-[140px]" value={f.value} onChange={(e) => f.onChange(e.target.value)} data-testid={`filter-${f.key}`}>
          {f.options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      ))}
      {children}
    </div>
  );
}
