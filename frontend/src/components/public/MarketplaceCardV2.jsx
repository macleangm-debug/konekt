import React from "react";
import { Link } from "react-router-dom";
import BrandBadge from "../ui/BrandBadge";
import { Package } from "lucide-react";

const API_BASE = process.env.REACT_APP_BACKEND_URL || "";

function resolveImageUrl(src) {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  if (src.startsWith("/")) return `${API_BASE}${src}`;
  return `${API_BASE}/api/files/serve/${src}`;
}

export default function MarketplaceCardV2({ item }) {
  const imgSrc = item.image_url || item.images?.[0] || item.hero_image || item.primary_image;
  return (
    <Link
      to={`/marketplace/${item.slug}`}
      className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      data-testid={`marketplace-card-${item.id}`}
    >
      <div className="h-44 bg-white overflow-hidden flex items-center justify-center p-3 border-b border-slate-100">
        {imgSrc ? (
          <img
            src={resolveImageUrl(imgSrc)}
            alt={item.name || "Marketplace listing"}
            loading="lazy"
            decoding="async"
            className="max-w-full max-h-full object-contain group-hover:scale-[1.04] transition duration-300"
            onError={(e) => { e.target.style.display = "none"; e.target.nextSibling && (e.target.nextSibling.style.display = "flex"); }}
          />
        ) : null}
        <div className={`w-full h-full flex items-center justify-center text-gray-300 ${imgSrc ? "hidden" : ""}`}>
          <Package className="w-10 h-10" />
        </div>
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
