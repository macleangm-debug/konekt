import React from "react";
import { Link } from "react-router-dom";
import BrandBadge from "../ui/BrandBadge";
import { Package } from "lucide-react";

export default function MarketplaceCardV2({ item }) {
  return (
    <Link
      to={`/marketplace/${item.slug}`}
      className="group rounded-3xl border bg-white overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition duration-200"
      data-testid={`marketplace-card-${item.id}`}
    >
      <div className="h-56 bg-slate-100 overflow-hidden">
        {item.images?.[0] || item.hero_image ? (
          <img
            src={item.images?.[0] || item.hero_image}
            alt={item.name || "Marketplace listing"}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <Package className="w-12 h-12" />
          </div>
        )}
      </div>

      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <BrandBadge tone="dark">{item.category || "General"}</BrandBadge>
          {item.listing_type === "service" && (
            <BrandBadge tone="gold">Service</BrandBadge>
          )}
        </div>

        <div className="text-lg font-bold text-[#20364D] line-clamp-2">
          {item.name}
        </div>

        <div className="text-sm text-slate-600 line-clamp-2 min-h-[40px]">
          {item.short_description || item.description || "No description available"}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="font-bold text-[#20364D] text-lg">
            {item.currency || "TZS"} {Number(item.customer_price || 0).toLocaleString()}
          </div>
          <div className="text-sm font-semibold text-slate-500 group-hover:text-[#20364D] transition">
            View →
          </div>
        </div>
      </div>
    </Link>
  );
}
