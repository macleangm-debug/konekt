import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Clock, Users, Check, ArrowLeft, ShoppingCart, Shield, Share2, Copy, MessageCircle, ArrowRight, Tag, Zap } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DealEndedFallback from "@/components/public/DealEndedFallback";

const fmt = (v) => `TZS ${Number(v || 0).toLocaleString("en-US")}`;

function DealCard({ deal }) {
  const progress = deal.display_target > 0 ? Math.round((deal.current_committed / deal.display_target) * 100) : 0;
  const daysLeft = deal.deadline ? Math.max(0, Math.ceil((new Date(deal.deadline) - new Date()) / 86400000)) : 0;
  const spotsLeft = Math.max(0, deal.display_target - deal.current_committed);

  return (
    <Link to={`/group-deals/${deal.id}`} className="block bg-white rounded-2xl border hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden group" data-testid={`deal-card-${deal.id}`}>
      {deal.product_image ? (
        <img src={deal.product_image} alt="" className="w-full h-44 object-cover group-hover:scale-[1.02] transition-transform" loading="lazy" />
      ) : (
        <div className="w-full h-44 bg-gradient-to-br from-[#20364D] to-[#1a365d] flex items-center justify-center"><ShoppingCart className="w-12 h-12 text-white/30" /></div>
      )}
      <div className="p-4 space-y-3">
        <div>
          <div className="text-base font-bold text-[#20364D] line-clamp-1">{deal.product_name}</div>
          {deal.description && <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{deal.description}</div>}
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xl font-extrabold text-[#D4A843]">{fmt(deal.discounted_price)}</span>
          {deal.original_price > deal.discounted_price && <span className="text-sm text-slate-400 line-through">{fmt(deal.original_price)}</span>}
        </div>
        {deal.original_price > deal.discounted_price && (
          <div className="rounded-lg bg-green-600 text-white px-3 py-1.5 text-center" data-testid="savings-badge">
            <span className="text-sm font-bold">Save {fmt(deal.original_price - deal.discounted_price)}</span>
          </div>
        )}
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{deal.current_committed}/{deal.display_target} units</span>
            <span>{spotsLeft} left</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-green-500" : progress >= 60 ? "bg-[#D4A843]" : "bg-blue-500"}`} style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-slate-500"><Clock className="w-3 h-3" /> {daysLeft}d left</span>
          <span className="flex items-center gap-1 text-slate-500"><Users className="w-3 h-3" /> {deal.buyer_count || 0} buyers</span>
        </div>
      </div>
    </Link>
  );
}

function DealCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border overflow-hidden animate-pulse">
      <div className="w-full h-44 bg-slate-100" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-slate-100 rounded w-3/4" />
        <div className="h-4 bg-slate-100 rounded w-1/2" />
        <div className="h-6 bg-slate-100 rounded w-2/3" />
        <div className="h-2 bg-slate-100 rounded-full" />
        <div className="flex justify-between">
          <div className="h-3 bg-slate-100 rounded w-16" />
          <div className="h-3 bg-slate-100 rounded w-16" />
        </div>
      </div>
    </div>
  );
}

function FeaturedDealBanner({ deal }) {
  if (!deal) return null;
  const progress = deal.display_target > 0 ? Math.round((deal.current_committed / deal.display_target) * 100) : 0;
  const daysLeft = deal.deadline ? Math.max(0, Math.ceil((new Date(deal.deadline) - new Date()) / 86400000)) : 0;
  const spotsLeft = Math.max(0, deal.display_target - deal.current_committed);

  return (
    <Link to={`/group-deals/${deal.id}`} className="block rounded-2xl bg-gradient-to-r from-[#0E1A2B] to-[#1a2d45] text-white overflow-hidden hover:shadow-xl transition-all group" data-testid="featured-deal-banner">
      <div className="flex flex-col md:flex-row items-center gap-6 p-6 md:p-8">
        <div className="w-full md:w-56 flex-shrink-0">
          {deal.product_image ? (
            <img src={deal.product_image} alt="" className="w-full h-40 md:h-48 rounded-xl object-cover group-hover:scale-[1.02] transition-transform" loading="lazy" />
          ) : (
            <div className="w-full h-40 md:h-48 rounded-xl bg-white/5 flex items-center justify-center">
              <ShoppingCart className="w-12 h-12 text-white/20" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-3 text-center md:text-left">
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <Zap className="w-4 h-4 text-[#D4A843]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#D4A843]">Featured Deal</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold">{deal.product_name}</h2>
          {deal.description && <p className="text-sm text-slate-300 line-clamp-2 max-w-lg">{deal.description}</p>}
          <div className="flex items-baseline gap-3 justify-center md:justify-start">
            <span className="text-2xl font-extrabold text-[#D4A843]">{fmt(deal.discounted_price)}</span>
            {deal.original_price > deal.discounted_price && <span className="text-sm text-slate-400 line-through">{fmt(deal.original_price)}</span>}
            {deal.original_price > deal.discounted_price && <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded">Save {fmt(deal.original_price - deal.discounted_price)}</span>}
          </div>
          <div className="max-w-sm mx-auto md:mx-0">
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>{deal.current_committed}/{deal.display_target} committed</span>
              <span>{spotsLeft} left</span>
            </div>
            <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-green-400" : "bg-[#D4A843]"}`} style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-4 justify-center md:justify-start text-xs text-slate-400">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {daysLeft}d left</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {deal.buyer_count || 0} buyers</span>
            <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-green-400" /> Refund guaranteed</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-[#D4A843] text-[#17283C] px-6 py-3 font-bold text-sm group-hover:bg-[#c49a3d] transition" data-testid="featured-deal-join-btn">
            Join Deal Now <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function GroupDealsListPage() {
  const [deals, setDeals] = useState([]);
  const [featuredDeal, setFeaturedDeal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/public/group-deals").catch(() => ({ data: [] })),
      api.get("/api/public/group-deals/deal-of-the-day").catch(() => ({ data: null })),
    ]).then(([dealsRes, featuredRes]) => {
      const allDeals = dealsRes.data || [];
      const featured = featuredRes.data;
      setFeaturedDeal(featured);
      // Remove featured from the grid to avoid duplication
      if (featured) {
        setDeals(allDeals.filter((d) => d.id !== featured.id));
      } else {
        setDeals(allDeals);
      }
      setLoading(false);
    });
  }, []);

  const totalDeals = deals.length + (featuredDeal ? 1 : 0);

  return (
    <div className="min-h-screen bg-slate-50" data-testid="group-deals-list">
      {/* Header */}
      <div className="bg-[#0E1A2B] text-white py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="flex items-center gap-2 justify-center mb-3">
            <Tag className="w-5 h-5 text-[#D4A843]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#D4A843]">Group Deals</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3" data-testid="deals-page-title">Unlock Lower Prices Together</h1>
          <p className="text-slate-300 max-w-xl mx-auto text-base">
            Join other buyers to unlock volume discounts on in-demand products. Commit now — your order activates once the minimum is reached. Full refund if it doesn't.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {loading ? (
          <>
            <div className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => <DealCardSkeleton key={i} />)}
            </div>
          </>
        ) : totalDeals === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border" data-testid="no-deals-state">
            <ShoppingCart className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#20364D] mb-2">No Active Deals Right Now</h2>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">Check back soon for new group deal opportunities. In the meantime, explore our marketplace.</p>
            <Link to="/marketplace" className="inline-flex items-center gap-2 rounded-xl bg-[#D4A843] text-[#17283C] px-6 py-3 font-bold hover:bg-[#c49a3d] transition" data-testid="explore-marketplace-btn">
              Explore Products <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            {/* Featured Deal */}
            {featuredDeal && <FeaturedDealBanner deal={featuredDeal} />}

            {/* Active Deals Grid */}
            {deals.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-[#20364D]">{featuredDeal ? "More Deals" : "Active Deals"}</h2>
                  <span className="text-sm text-slate-500">{deals.length} deal{deals.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="deals-grid">
                  {deals.map((d) => <DealCard key={d.id} deal={d} />)}
                </div>
              </div>
            )}

            {/* Trust Footer */}
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              {[
                { label: "Refund Guaranteed", text: "If the deal doesn't reach its target, you get a full refund." },
                { label: "Verified Payments", text: "All payments are verified by admin before orders are processed." },
                { label: "Volume Savings", text: "The more people join, the better the deal for everyone." },
              ].map((t) => (
                <div key={t.label} className="bg-white rounded-xl border p-4 flex items-start gap-3" data-testid={`trust-${t.label.toLowerCase().replace(/\s/g, '-')}`}>
                  <Shield className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-[#20364D]">{t.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ShareButtons({ dealUrl, productName }) {
  const shareText = `Check out this group deal on Konekt: ${productName} — join and save!`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + " " + dealUrl)}`;
  const copyLink = () => { navigator.clipboard.writeText(dealUrl).then(() => toast.success("Link copied!")).catch(() => {}); };
  return (
    <div className="flex items-center gap-2" data-testid="share-buttons">
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition" data-testid="share-whatsapp">
        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
      </a>
      <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition" data-testid="share-copy-link">
        <Copy className="w-3.5 h-3.5" /> Copy Link
      </button>
    </div>
  );
}


// ─── DEAL DETAIL PAGE ───

export default function GroupDealDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    api.get(`/api/public/group-deals/${id}`)
      .then((r) => setDeal(r.data))
      .catch(() => setMissing(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>;
  if (missing || !deal) return <DealEndedFallback kind="group deal" reason="missing" />;

  // Treat finished/expired deals as ended → fallback page (not a blank screen)
  const isExpired = deal.deadline && new Date(deal.deadline) < new Date();
  const isFinished = ["closed", "fulfilled", "expired", "cancelled"].includes((deal.status || "").toLowerCase());
  if (isExpired || isFinished) return <DealEndedFallback kind="group deal" reason="ended" />;

  const progress = deal.display_target > 0 ? Math.round((deal.current_committed / deal.display_target) * 100) : 0;
  const daysLeft = deal.deadline ? Math.max(0, Math.ceil((new Date(deal.deadline) - new Date()) / 86400000)) : 0;
  const hoursLeft = deal.deadline ? Math.max(0, Math.ceil((new Date(deal.deadline) - new Date()) / 3600000) % 24) : 0;
  const spotsLeft = Math.max(0, deal.display_target - deal.current_committed);
  const dealUrl = `${window.location.origin}/group-deals/${id}`;

  // Redirect to canonical checkout with mode=group_deal
  const handleJoinDeal = () => {
    navigate(`/group-deals/checkout?campaign_id=${id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 lg:pb-8" data-testid="deal-detail-page">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <Link to="/group-deals" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-6" data-testid="back-to-deals">
          <ArrowLeft className="w-4 h-4" /> All Deals
        </Link>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            {deal.product_image ? <img src={deal.product_image} alt="" className="w-full rounded-2xl object-cover max-h-96" loading="lazy" /> :
              <div className="w-full h-72 rounded-2xl bg-gradient-to-br from-[#20364D] to-[#1a365d] flex items-center justify-center"><ShoppingCart className="w-16 h-16 text-white/20" /></div>}
            {(() => {
              const raw = (deal.description || "").trim();
              // Strip any legacy internal-mechanics text that may be stored
              // on older auto-generated campaigns (funding %, distributable
              // margin, tier labels like "Micro (0 – 2K)").
              const looksInternal = /distributable margin|funding|pool|micro \(|small \(|medium \(|large \(|internal deal/i.test(raw);
              const text = looksInternal
                ? `Team up with other buyers to unlock a special group price on ${deal.product_name}. When enough buyers commit, everyone pays the discounted rate — you save ${fmt(Math.max(0, (deal.original_price || 0) - (deal.discounted_price || 0)))} per unit.`
                : raw;
              return text ? (
                <div className="mt-4 bg-white rounded-2xl border p-5">
                  <h3 className="font-bold text-[#20364D] mb-2">About This Deal</h3>
                  <p className="text-sm text-slate-600">{text}</p>
                </div>
              ) : null;
            })()}
            <div className="mt-4 bg-white rounded-2xl border p-5 hidden lg:block">
              <h3 className="font-bold text-[#20364D] mb-2 flex items-center gap-2"><Share2 className="w-4 h-4" /> Share This Deal</h3>
              <p className="text-xs text-slate-500 mb-3">Help this deal reach its target.</p>
              <ShareButtons dealUrl={dealUrl} productName={deal.product_name} />
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border p-5 space-y-4">
              <h1 className="text-xl font-bold text-[#20364D]">{deal.product_name}</h1>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-extrabold text-[#D4A843]">{fmt(deal.discounted_price)}</span>
                {deal.original_price > deal.discounted_price && <span className="text-base text-slate-400 line-through">{fmt(deal.original_price)}</span>}
              </div>
              {deal.original_price > deal.discounted_price && <div className="inline-block text-sm font-bold text-green-700 bg-green-50 px-3 py-1 rounded-lg">Save {fmt(deal.original_price - deal.discounted_price)}</div>}

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold text-[#20364D]">{deal.current_committed}/{deal.display_target} units</span>
                  <span className="text-slate-500">{spotsLeft} left</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-green-500" : "bg-[#D4A843]"}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
                <div className="text-xs text-slate-500 mt-1">{deal.buyer_count || 0} buyers joined</div>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="w-4 h-4" /><span>{daysLeft}d {hoursLeft}h remaining</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-slate-500"><Shield className="w-3 h-3 text-green-500" /> Activates once minimum is reached</div>
                <div className="flex items-center gap-2 text-xs text-slate-500"><Shield className="w-3 h-3 text-green-500" /> Full refund if campaign fails</div>
                <div className="flex items-center gap-2 text-xs text-slate-500"><Check className="w-3 h-3 text-green-500" /> Secure payment — admin verified</div>
                <div className="flex items-center gap-2 text-xs text-slate-500"><Users className="w-3 h-3 text-green-500" /> {deal.buyer_count || 0} buyers, {deal.current_committed} units</div>
              </div>

              {deal.status === "active" ? (
                <Button onClick={handleJoinDeal} className="w-full bg-[#D4A843] hover:bg-[#c49933] text-[#20364D] font-bold py-3 text-base hidden lg:flex" data-testid="join-deal-btn-desktop">
                  Join Deal — {fmt(deal.discounted_price)}/unit
                </Button>
              ) : (
                <div className="p-3 bg-green-50 rounded-xl text-center text-sm font-semibold text-green-700">Target reached — orders being processed</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA — redirects to checkout page */}
      {deal.status === "active" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-xl p-3 z-50 lg:hidden" data-testid="sticky-join-cta">
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500 truncate">{deal.product_name}</div>
              <div className="text-base font-extrabold text-[#D4A843]">{fmt(deal.discounted_price)}/unit</div>
            </div>
            <Button onClick={handleJoinDeal} className="bg-[#D4A843] hover:bg-[#c49933] text-[#20364D] font-bold px-6 py-3 flex-shrink-0" data-testid="join-deal-btn-mobile">
              Join Deal
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
