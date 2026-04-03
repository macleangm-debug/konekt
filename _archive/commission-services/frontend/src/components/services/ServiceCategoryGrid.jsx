import React from "react";
import ServiceRequestActions from "./ServiceRequestActions";

export default function ServiceCategoryGrid({ categories, services, activeCategory, accountMode = false, onCategoryChange }) {
  const visible = services.filter((x) => x.group_key === activeCategory);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {categories.map((category) => (
          <button
            key={category.key}
            type="button"
            onClick={() => onCategoryChange(category.key)}
            className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
              activeCategory === category.key
                ? "bg-[#20364D] text-white"
                : "bg-white border text-slate-700 hover:bg-slate-100"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {visible.map((service) => (
          <div key={service.key} className="rounded-[2rem] border bg-white p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between gap-4">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">
                ✦
              </div>
              <div className="rounded-full bg-slate-100 text-slate-600 px-3 py-1 text-xs font-semibold">
                {categories.find((x) => x.key === service.group_key)?.name}
              </div>
            </div>

            <div className="text-2xl font-bold text-[#20364D] mt-6">{service.name}</div>
            <p className="text-slate-600 mt-3 leading-6">{service.short_description}</p>

            <ServiceRequestActions service={service} accountMode={accountMode} />
          </div>
        ))}
      </div>
    </div>
  );
}
