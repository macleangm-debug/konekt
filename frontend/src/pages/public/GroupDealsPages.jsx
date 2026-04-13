import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Clock, Users, Check, ArrowLeft, ShoppingCart, Shield, Share2, Copy, MessageCircle } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const fmt = (v) => `TZS ${Number(v || 0).toLocaleString("en-US")}`;

function DealCard({ deal }) {
  const progress = deal.display_target > 0 ? Math.round((deal.current_committed / deal.display_target) * 100) : 0;
  const daysLeft = deal.deadline ? Math.max(0, Math.ceil((new Date(deal.deadline) - new Date()) / 86400000)) : 0;
  const spotsLeft = Math.max(0, deal.display_target - deal.current_committed);

  return (
    <Link to={`/group-deals/${deal.id}`} className="block bg-white rounded-2xl border hover:shadow-md transition-all overflow-hidden" data-testid={`deal-card-${deal.id}`}>
      {deal.product_image && <img src={deal.product_image} alt="" className="w-full h-44 object-cover" />}
      {!deal.product_image && <div className="w-full h-44 bg-gradient-to-br from-[#20364D] to-[#1a365d] flex items-center justify-center"><ShoppingCart className="w-12 h-12 text-white/30" /></div>}
      <div className="p-4 space-y-3">
        <div>
          <div className="text-base font-bold text-[#20364D]">{deal.product_name}</div>
          {deal.description && <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{deal.description}</div>}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-extrabold text-[#D4A843]">{fmt(deal.discounted_price)}</span>
          {deal.original_price > deal.discounted_price && <span className="text-sm text-slate-400 line-through">{fmt(deal.original_price)}</span>}
          {deal.discount_pct > 0 && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md">{deal.discount_pct}% off</span>}
        </div>
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{deal.current_committed}/{deal.display_target} units</span>
            <span>{spotsLeft} left</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${progress >= 100 ? "bg-green-500" : progress >= 60 ? "bg-[#D4A843]" : "bg-blue-500"}`} style={{ width: `${Math.min(progress, 100)}%` }} />
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

export function GroupDealsListPage() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/public/group-deals")
      .then((r) => setDeals(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4" data-testid="group-deals-list">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#20364D]">Group Deals</h1>
          <p className="text-slate-500 mt-2">Volume discounts — join together, save more</p>
        </div>
        {loading ? <div className="text-center text-slate-500 py-16">Loading deals...</div> :
          deals.length === 0 ? <div className="text-center text-slate-400 py-16 bg-white rounded-2xl border">No active deals right now. Check back soon.</div> :
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {deals.map((d) => <DealCard key={d.id} deal={d} />)}
          </div>
        }
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

  useEffect(() => {
    api.get(`/api/public/group-deals/${id}`)
      .then((r) => setDeal(r.data))
      .catch(() => toast.error("Deal not found"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>;
  if (!deal) return <div className="min-h-screen flex items-center justify-center text-slate-500">Deal not found</div>;

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
            {deal.product_image ? <img src={deal.product_image} alt="" className="w-full rounded-2xl object-cover max-h-96" /> :
              <div className="w-full h-72 rounded-2xl bg-gradient-to-br from-[#20364D] to-[#1a365d] flex items-center justify-center"><ShoppingCart className="w-16 h-16 text-white/20" /></div>}
            {deal.description && <div className="mt-4 bg-white rounded-2xl border p-5"><h3 className="font-bold text-[#20364D] mb-2">About This Deal</h3><p className="text-sm text-slate-600">{deal.description}</p></div>}
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
              {deal.discount_pct > 0 && <div className="inline-block text-sm font-bold text-green-700 bg-green-50 px-3 py-1 rounded-lg">Save {deal.discount_pct}%</div>}

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
