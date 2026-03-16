import React from "react";
import { Link } from "react-router-dom";
import { Package } from "lucide-react";

export default function FeaturedMarketplaceSection({ listings = [] }) {
  if (!listings.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-10 space-y-6" data-testid="featured-marketplace">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#20364D]">Featured Products & Services</h2>
          <p className="text-slate-600 mt-2">Browse curated options available in your market.</p>
        </div>
        <Link to="/marketplace" className="font-semibold text-[#20364D] hover:underline">
          View all →
        </Link>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
        {listings.map((item) => (
          <Link
            key={item.id}
            to={`/marketplace/${item.slug}`}
            className="group rounded-3xl border bg-white overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition duration-200"
            data-testid={`featured-item-${item.id}`}
          >
            <div className="h-52 bg-slate-100 overflow-hidden">
              {item.images?.[0] || item.hero_image ? (
                <img 
                  src={item.images?.[0] || item.hero_image} 
                  alt={item.name} 
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-300" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-12 h-12 text-slate-300" />
                </div>
              )}
            </div>
            <div className="p-5">
              <div className="text-sm text-slate-500 capitalize">{item.category || "-"}</div>
              <div className="font-bold text-lg mt-1 line-clamp-2">{item.name}</div>
              <div className="text-sm text-slate-600 mt-2 line-clamp-2 min-h-[40px]">
                {item.short_description || item.description}
              </div>
              <div className="font-bold text-[#20364D] mt-4">
                {item.currency || "TZS"} {Number(item.customer_price || 0).toLocaleString()}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
