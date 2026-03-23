import React, { useEffect, useMemo, useState } from "react";
import { Search, Filter, X } from "lucide-react";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function MarketplaceSearchAndFilters({ value, onChange }) {
  const [filters, setFilters] = useState({ groups: [], subgroups: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/api/marketplace/filters`)
      .then((res) => setFilters(res.data || { groups: [], subgroups: [] }))
      .catch(() => setFilters({ groups: [], subgroups: [] }))
      .finally(() => setLoading(false));
  }, []);

  const availableSubgroups = useMemo(
    () => !value.group_slug ? filters.subgroups : filters.subgroups.filter((x) => x.group_slug === value.group_slug),
    [filters, value.group_slug]
  );

  const hasActiveFilters = value.q || value.group_slug || value.subgroup_slug;

  const clearFilters = () => {
    onChange({ q: "", group_slug: "", subgroup_slug: "" });
  };

  return (
    <div className="rounded-[2rem] border bg-white p-5 space-y-4" data-testid="marketplace-search-filters">
      <div className="flex items-center justify-between">
        <div className="text-lg font-bold text-[#20364D] flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Search & Filter
        </div>
        {hasActiveFilters && (
          <button 
            onClick={clearFilters}
            className="text-sm text-slate-500 hover:text-[#20364D] flex items-center gap-1 transition"
          >
            <X className="w-4 h-4" />
            Clear filters
          </button>
        )}
      </div>
      
      <div className="grid xl:grid-cols-[1.4fr_1fr_1fr] gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            className="w-full border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20" 
            placeholder="Search by product name, group, or subgroup" 
            value={value.q} 
            onChange={(e) => onChange({ ...value, q: e.target.value })} 
            data-testid="search-input"
          />
        </div>
        
        <select 
          className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20 appearance-none bg-white cursor-pointer" 
          value={value.group_slug} 
          onChange={(e) => onChange({ ...value, group_slug: e.target.value, subgroup_slug: "" })}
          disabled={loading}
          data-testid="group-filter"
        >
          <option value="">All Product Groups</option>
          {filters.groups.map((group) => (
            <option key={group.slug} value={group.slug}>{group.name}</option>
          ))}
        </select>
        
        <select 
          className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#20364D]/20 appearance-none bg-white cursor-pointer" 
          value={value.subgroup_slug} 
          onChange={(e) => onChange({ ...value, subgroup_slug: e.target.value })}
          disabled={loading || !availableSubgroups.length}
          data-testid="subgroup-filter"
        >
          <option value="">All Sub-Groups</option>
          {availableSubgroups.map((group) => (
            <option key={group.slug} value={group.slug}>{group.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
