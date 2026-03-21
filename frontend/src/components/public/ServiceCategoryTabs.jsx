import React from "react";

export default function ServiceCategoryTabs({
  categories,
  activeKey,
  onChange,
}) {
  return (
    <div className="flex flex-wrap gap-3" data-testid="service-category-tabs">
      {categories.map((category) => (
        <button
          key={category.key}
          type="button"
          onClick={() => onChange(category.key)}
          data-testid={`category-tab-${category.key}`}
          className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
            activeKey === category.key
              ? "bg-[#20364D] text-white"
              : "bg-white border text-slate-700 hover:bg-slate-100"
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
