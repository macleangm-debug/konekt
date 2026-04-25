import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Clock, ShoppingBag, Tag, ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";

const fmt = (v) => `TZS ${Number(v || 0).toLocaleString("en-US")}`;

/**
 * DealEndedFallback
 * ─────────────────
 * Shown when a referral / shared link points to a campaign that has
 * expired or no longer exists.  Replaces the old blank "Deal not found"
 * screen with a friendly redirect card and 3 alternatives — so traffic
 * the affiliate already sent does not bounce.
 */
export default function DealEndedFallback({ kind = "deal", reason = "ended" }) {
  const navigate = useNavigate();
  const [alternatives, setAlternatives] = useState([]);
  const [livePromos, setLivePromos] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dealsRes, promosRes] = await Promise.all([
          api.get("/api/public/group-deals?limit=4&status=active").catch(() => ({ data: [] })),
          api.get("/api/promotions/active?limit=4").catch(() => ({ data: { promotions: [] } })),
        ]);
        if (cancelled) return;
        const deals = Array.isArray(dealsRes.data) ? dealsRes.data : (dealsRes.data?.deals || []);
        setAlternatives(deals.slice(0, 4));
        setLivePromos((promosRes.data?.promotions || promosRes.data || []).slice(0, 4));
      } catch {
        /* graceful fallback handled by empty-state copy */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const verb = reason === "missing" ? "is no longer available" : "has ended";

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4" data-testid="deal-ended-fallback">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-4" data-testid="fallback-back-home">
          <ArrowLeft className="w-3 h-3" /> Konekt Home
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 mb-6 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#20364D]">This {kind} {verb}</h1>
          <p className="text-slate-500 mt-2 text-sm sm:text-base leading-relaxed">
            But the savings don't have to. Here are live deals and offers your network is loving right now.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <Button size="sm" onClick={() => navigate("/group-deals")} className="bg-[#20364D] hover:bg-[#1a2d40]" data-testid="fallback-cta-deals">
              View live deals <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/marketplace")} data-testid="fallback-cta-marketplace">
              Browse marketplace
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/promotions")} data-testid="fallback-cta-promos">
              See active promotions
            </Button>
          </div>
        </div>

        {alternatives.length > 0 && (
          <section className="mb-6" data-testid="fallback-deals-section">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <ShoppingBag className="w-3.5 h-3.5" /> Live group deals
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {alternatives.map((d) => (
                <Link key={d.id} to={`/group-deals/${d.id}`} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-[#D4A843] hover:shadow-md transition" data-testid={`fallback-deal-${d.id}`}>
                  <p className="font-medium text-[#20364D] line-clamp-1">{d.product_name}</p>
                  <p className="text-xs text-slate-500 mt-1">Save {fmt(Math.max(0, (d.original_price || 0) - (d.discounted_price || 0)))} · {d.buyer_count || 0} buyers</p>
                  <p className="text-base font-bold text-[#D4A843] mt-2">{fmt(d.discounted_price)}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {livePromos.length > 0 && (
          <section data-testid="fallback-promos-section">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5" /> Active promotions
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {livePromos.map((p) => (
                <Link key={p.id} to={`/promo/${p.id}`} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-[#D4A843] hover:shadow-md transition" data-testid={`fallback-promo-${p.id}`}>
                  <p className="font-medium text-[#20364D] line-clamp-1">{p.name || p.title}</p>
                  {p.discount_label && <p className="text-xs text-amber-700 mt-1">{p.discount_label}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
