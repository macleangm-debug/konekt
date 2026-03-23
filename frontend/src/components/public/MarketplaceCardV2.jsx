import React from "react";
import { Link } from "react-router-dom";
import BrandBadge from "../ui/BrandBadge";
import { Package } from "lucide-react";

export default function MarketplaceCardV2({ item }) {
  return (
    <Link
      to={`/marketplace/${item.slug}`}
      className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      data-testid={`marketplace-card-${item.id}`}
    >
      <div className="h-44 bg-[#f8fafc] overflow-hidden">
        {item.images?.[0] || item.hero_image ? (
          <img
            src={item.images?.[0] || item.hero_image}
            alt={item.name || "Marketplace listing"}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Package className="w-10 h-10" />
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <BrandBadge tone="dark">{item.category || "General"}</BrandBadge>
          {item.listing_type === "service" && (
            <BrandBadge tone="gold">Service</BrandBadge>
          )}
        </div>

        <h3 className="text-sm font-semibold text-[#0f172a] line-clamp-2 mb-1">
          {item.name}
        </h3>

        <p className="text-xs text-[#64748b] line-clamp-2 min-h-[32px]">
          {item.short_description || item.description || "No description available"}
        </p>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <span className="font-semibold text-[#0f172a]">
            {item.currency || "TZS"} {Number(item.customer_price || 0).toLocaleString()}
          </span>
          <span className="text-xs font-medium text-[#94a3b8] group-hover:text-[#1f3a5f] transition-colors">
            View Details
          </span>
        </div>
      </div>
    </Link>
  );
}
