import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Users, ShoppingCart, ArrowRight, Shield } from "lucide-react";
import api from "@/lib/api";

const fmt = (v) => `TZS ${Number(v || 0).toLocaleString("en-US")}`;

function FeaturedDealCard({ deal }) {
  const progress = deal.display_target > 0 ? Math.round((deal.current_committed / deal.display_target) * 100) : 0;
  const daysLeft = deal.deadline ? Math.max(0, Math.ceil((new Date(deal.deadline) - new Date()) / 86400000)) : 0;
  const spotsLeft = Math.max(0, deal.display_target - deal.current_committed);

  return (
    <Link
      to={`/group-deals/${deal.id}`}
      className="flex-shrink-0 w-72 sm:w-auto bg-white rounded-2xl border hover:shadow-lg transition-all overflow-hidden group"
      data-testid={`featured-deal-${deal.id}`}
    >
      {deal.product_image ? (
        <img src={deal.product_image} alt="" className="w-full h-40 object-cover group-hover:scale-[1.02] transition-transform" />
      ) : (
        <div className="w-full h-40 bg-gradient-to-br from-[#20364D] to-[#1a365d] flex items-center justify-center">
          <ShoppingCart className="w-10 h-10 text-white/20" />
        </div>
      )}
      <div className="p-4 space-y-2.5">
        <div className="text-sm font-bold text-[#20364D] line-clamp-1">{deal.product_name}</div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-extrabold text-[#D4A843]">{fmt(deal.discounted_price)}</span>
          {deal.original_price > deal.discounted_price && (
            <span className="text-xs text-slate-400 line-through">{fmt(deal.original_price)}</span>
          )}
          {deal.original_price > deal.discounted_price && (
            <span className="text-[10px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">Save {fmt(deal.original_price - deal.discounted_price)}</span>
          )}
        </div>
        {/* Progress bar */}
        <div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-green-500" : progress >= 60 ? "bg-[#D4A843]" : "bg-blue-500"}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>{deal.current_committed}/{deal.display_target} joined</span>
            <span>{spotsLeft} left</span>
          </div>
        </div>
        {/* Timer + trust */}
        <div className="flex items-center justify-between text-[10px]">
          <span className="flex items-center gap-1 text-slate-500"><Clock className="w-3 h-3" />{daysLeft}d left</span>
          <span className="flex items-center gap-1 text-green-600"><Shield className="w-3 h-3" />Refund guaranteed</span>
        </div>
      </div>
    </Link>
  );
}

export default function HomepageGroupDealsSection() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/public/group-deals/featured")
      .then((r) => setDeals(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || deals.length === 0) return null;

  return (
    <section className="py-14 md:py-18 bg-gradient-to-b from-white to-slate-50" data-testid="homepage-group-deals">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block w-8 h-0.5 bg-[#D4A843] rounded-full" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#D4A843]">Group Deals</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#20364D]">Join Together, Save More</h2>
            <p className="text-slate-500 mt-1 text-sm sm:text-base max-w-lg">
              Volume-based pricing on in-demand products. Commit now — your order activates once the minimum is reached. Full refund if it doesn't.
            </p>
          </div>
          <Link
            to="/group-deals"
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-[#20364D] hover:text-[#D4A843] transition whitespace-nowrap"
            data-testid="view-all-deals-btn"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Horizontal scroll on mobile, grid on desktop */}
        <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0 sm:overflow-visible scrollbar-hide">
          {deals.map((d) => (
            <FeaturedDealCard key={d.id} deal={d} />
          ))}
        </div>

        {/* Mobile "View All" link */}
        <div className="sm:hidden mt-4 text-center">
          <Link
            to="/group-deals"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#20364D] hover:text-[#D4A843] transition"
            data-testid="view-all-deals-btn-mobile"
          >
            View All Deals <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
