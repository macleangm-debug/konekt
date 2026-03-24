import React from "react";

export default function AdaptiveMarketplaceSearch({ tab, value, onChange }) {
  const placeholder = tab === "products"
    ? "Search by product, group, or subgroup"
    : tab === "services"
    ? "Search services by name or category"
    : "Search promotional materials";

  return (
    <div className="rounded-[2rem] border bg-white p-5 space-y-4">
      <div className="text-lg font-bold text-[#20364D]">Search & Filter</div>
      <div className="grid xl:grid-cols-[1.5fr_1fr_1fr] gap-4">
        <input className="w-full border rounded-xl px-4 py-3" placeholder={placeholder} value={value.q} onChange={(e) => onChange({ ...value, q: e.target.value })} />
        <select className="w-full border rounded-xl px-4 py-3" value={value.group} onChange={(e) => onChange({ ...value, group: e.target.value })}>
          <option value="">All Groups</option>
        </select>
        <select className="w-full border rounded-xl px-4 py-3" value={value.subgroup} onChange={(e) => onChange({ ...value, subgroup: e.target.value })}>
          <option value="">All Sub-Groups</option>
        </select>
      </div>
    </div>
  );
}
