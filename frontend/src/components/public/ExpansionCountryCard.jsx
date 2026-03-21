import React from "react";

export default function ExpansionCountryCard({
  country,
  selected,
  onSelect,
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(country.code)}
      data-testid={`expansion-country-card-${country.code}`}
      className={`w-full text-left rounded-3xl border p-5 transition ${
        selected
          ? "bg-[#20364D] text-white border-[#20364D]"
          : "bg-white hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-bold">{country.name}</div>
          <div className={`text-sm mt-2 ${selected ? "text-slate-200" : "text-slate-500"}`}>
            {country.status_label || "Expansion Target"}
          </div>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${
          selected ? "bg-white/10 text-white" : "bg-[#F4E7BF] text-[#8B6A10]"
        }`}>
          {country.badge || "Priority Market"}
        </div>
      </div>

      <p className={`mt-4 text-sm leading-6 ${selected ? "text-slate-200" : "text-slate-600"}`}>
        {country.description}
      </p>
    </button>
  );
}
