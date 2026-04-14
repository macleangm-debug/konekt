import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Users, Shield, ArrowRight, ShoppingCart } from "lucide-react";
import api from "@/lib/api";

const fmt = (v) => `TZS ${Number(v || 0).toLocaleString("en-US")}`;

export default function DealOfTheDayHero() {
  const [deal, setDeal] = useState(null);

  useEffect(() => {
    api.get("/api/public/group-deals/deal-of-the-day")
      .then((r) => { if (r.data) setDeal(r.data); })
      .catch(() => {});
  }, []);

  if (!deal) return null;

  const progress = deal.display_target > 0 ? Math.round((deal.current_committed / deal.display_target) * 100) : 0;
  const daysLeft = deal.deadline ? Math.max(0, Math.ceil((new Date(deal.deadline) - new Date()) / 86400000)) : 0;
  const hoursLeft = deal.deadline ? Math.max(0, Math.ceil((new Date(deal.deadline) - new Date()) / 3600000) % 24) : 0;
  const spotsLeft = Math.max(0, deal.display_target - deal.current_committed);
  const almostThere = progress >= 70;

  return (
    <section className="bg-gradient-to-r from-[#0E1A2B] to-[#1a2d45] text-white" data-testid="deal-of-the-day-hero">
      <div className="max-w-7xl mx-auto px-6 py-8 md:py-10">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Image */}
          <div className="w-full md:w-48 flex-shrink-0">
            {deal.product_image ? (
              <img src={deal.product_image} alt="" className="w-full h-40 md:h-48 rounded-2xl object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-40 md:h-48 rounded-2xl bg-white/5 flex items-center justify-center">
                <ShoppingCart className="w-12 h-12 text-white/20" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 space-y-3 text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <span className="inline-block w-6 h-0.5 bg-[#D4A843] rounded-full" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4A843]">Deal of the Day</span>
            </div>

            <h2 className="text-xl md:text-2xl font-bold leading-tight">{deal.product_name}</h2>

            <div className="flex items-baseline gap-3 justify-center md:justify-start">
              <span className="text-2xl font-extrabold text-[#D4A843]">{fmt(deal.discounted_price)}</span>
              {deal.original_price > deal.discounted_price && (
                <span className="text-sm text-slate-400 line-through">{fmt(deal.original_price)}</span>
              )}
              {deal.original_price > deal.discounted_price && (
                <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded">Save {fmt(deal.original_price - deal.discounted_price)}</span>
              )}
            </div>

            {/* Progress */}
            <div className="max-w-md mx-auto md:mx-0">
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>{deal.current_committed}/{deal.display_target} units committed</span>
                <span>{spotsLeft} left</span>
              </div>
              <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-green-400" : "bg-[#D4A843]"}`}
                  style={{ width: `${Math.min(progress, 100)}%` }} />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[10px]">
                <span className="flex items-center gap-1 text-slate-400"><Users className="w-3 h-3" />{deal.buyer_count || 0} buyers</span>
                <span className="flex items-center gap-1 text-slate-400"><Clock className="w-3 h-3" />{daysLeft}d {hoursLeft}h left</span>
              </div>
            </div>

            {/* Urgency messaging */}
            {almostThere && (
              <div className="text-xs font-bold text-[#D4A843] animate-pulse" data-testid="urgency-message">
                Almost there — only {spotsLeft} units to go!
              </div>
            )}

            <div className="flex items-center gap-3 justify-center md:justify-start flex-wrap">
              <Link to={`/group-deals/${deal.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#D4A843] text-[#17283C] px-6 py-3 font-bold hover:bg-[#c49a3d] transition text-sm"
                data-testid="dotd-join-btn">
                Join Deal Now <ArrowRight className="w-4 h-4" />
              </Link>
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <Shield className="w-3 h-3 text-green-400" /> Refund if campaign fails
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
