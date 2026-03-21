import React from "react";
import { Link } from "react-router-dom";

export default function ServiceFeaturedStrip({ items = [] }) {
  if (!items.length) return null;

  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4" data-testid="service-featured-strip">
      {items.map((item) => (
        <Link
          key={item.slug}
          to={`/services/${item.slug}`}
          data-testid={`featured-service-${item.slug}`}
          className="rounded-3xl border bg-white p-5 hover:shadow-md transition"
        >
          <div className="rounded-full bg-[#F4E7BF] text-[#8B6A10] px-3 py-1 text-xs font-semibold w-fit">
            Featured
          </div>
          <div className="text-lg font-bold text-[#20364D] mt-4">{item.name}</div>
          <p className="text-slate-600 mt-2 text-sm">{item.short_description}</p>
          <div className="mt-4 text-sm font-semibold text-[#20364D]">View Service →</div>
        </Link>
      ))}
    </div>
  );
}
