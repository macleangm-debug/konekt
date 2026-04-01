import React from "react";
import { Link } from "react-router-dom";
import { Package, Wrench, Megaphone } from "lucide-react";

function getListingMeta(item) {
  const cat = (item.category || "").toLowerCase();
  const listingType = item.listing_type || (cat.includes("service") ? "service" : "product");
  const isPromo = ["promo", "promotional", "printing & promotional materials"].some((token) =>
    `${item.group_name || item.category || ""}`.toLowerCase().includes(token)
  );

  if (isPromo) {
    return {
      badge: "Promotional Materials",
      cta: "Customize or request sample",
      icon: Megaphone,
      href: item.slug ? `/request-quote?type=promo_custom&item=${item.slug}` : "/request-quote?type=promo_custom",
    };
  }

  if (listingType === "service") {
    return {
      badge: "Service",
      cta: "Request service",
      icon: Wrench,
      href: item.slug ? `/request-quote?type=service_quote&service=${item.slug}` : "/request-quote?type=service_quote",
    };
  }

  return {
    badge: "Product",
    cta: "Order or request bulk quote",
    icon: Package,
    href: item.slug ? `/marketplace/${item.slug}` : "/marketplace",
  };
}

export default function FeaturedMarketplaceSection({ listings = [] }) {
  if (!listings.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-10 space-y-6" data-testid="featured-marketplace">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#20364D]">Featured Products, Promotional Materials & Services</h2>
          <p className="text-slate-600 mt-2">Browse curated options and start from the right commercial flow.</p>
        </div>
        <Link to="/marketplace" className="font-semibold text-[#20364D] hover:underline">
          View all →
        </Link>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
        {listings.map((item) => {
          const meta = getListingMeta(item);
          const Icon = meta.icon;
          return (
            <Link
              key={item.id}
              to={meta.href}
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
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  <Icon className="w-3.5 h-3.5" />
                  {meta.badge}
                </div>
                <div className="font-bold text-lg mt-3 line-clamp-2">{item.name}</div>
                <div className="text-sm text-slate-600 mt-2 line-clamp-2 min-h-[40px]">
                  {item.short_description || item.description}
                </div>
                <div className="font-bold text-[#20364D] mt-4">
                  {item.currency || "TZS"} {Number(item.customer_price || 0).toLocaleString()}
                </div>
                <div className="mt-3 text-sm font-semibold text-[#20364D]">{meta.cta}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
