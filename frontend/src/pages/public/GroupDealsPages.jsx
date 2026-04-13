import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Clock, Users, Check, ArrowLeft, ShoppingCart, Shield, Share2, Copy, MessageCircle } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
            <span>{deal.current_committed} joined</span>
            <span>{spotsLeft} spots left</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${progress >= 100 ? "bg-green-500" : progress >= 60 ? "bg-[#D4A843]" : "bg-blue-500"}`} style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-slate-500"><Clock className="w-3 h-3" /> {daysLeft}d left</span>
          <span className="flex items-center gap-1 text-slate-500"><Users className="w-3 h-3" /> {deal.current_committed}/{deal.display_target}</span>
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


// ─── SHARE HELPERS ───

function ShareButtons({ dealUrl, productName }) {
  const shareText = `Check out this group deal on Konekt: ${productName} — join and save!`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + " " + dealUrl)}`;

  const copyLink = () => {
    navigator.clipboard.writeText(dealUrl).then(() => toast.success("Link copied!")).catch(() => toast.error("Failed to copy"));
  };

  return (
    <div className="flex items-center gap-2" data-testid="share-buttons">
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition"
        data-testid="share-whatsapp">
        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
      </a>
      <button onClick={copyLink}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition"
        data-testid="share-copy-link">
        <Copy className="w-3.5 h-3.5" /> Copy Link
      </button>
    </div>
  );
}


// ─── DEAL DETAIL PAGE ───

export default function GroupDealDetailPage() {
  const { id } = useParams();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [joinForm, setJoinForm] = useState({ customer_name: "", customer_phone: "", payment_method: "cash" });
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    api.get(`/api/public/group-deals/${id}`)
      .then((r) => setDeal(r.data))
      .catch(() => toast.error("Deal not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinForm.customer_name && !joinForm.customer_phone) { toast.error("Name or phone required"); return; }
    setJoining(true);
    try {
      await api.post(`/api/admin/group-deals/campaigns/${id}/join`, joinForm);
      setJoined(true);
      toast.success("You've joined the deal!");
      const r = await api.get(`/api/public/group-deals/${id}`);
      setDeal(r.data);
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to join"); }
    finally { setJoining(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>;
  if (!deal) return <div className="min-h-screen flex items-center justify-center text-slate-500">Deal not found</div>;

  const progress = deal.display_target > 0 ? Math.round((deal.current_committed / deal.display_target) * 100) : 0;
  const daysLeft = deal.deadline ? Math.max(0, Math.ceil((new Date(deal.deadline) - new Date()) / 86400000)) : 0;
  const hoursLeft = deal.deadline ? Math.max(0, Math.ceil((new Date(deal.deadline) - new Date()) / 3600000) % 24) : 0;
  const spotsLeft = Math.max(0, deal.display_target - deal.current_committed);
  const dealUrl = `${window.location.origin}/group-deals/${id}`;

  // ─── POST-JOIN SCREEN ───
  if (joined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" data-testid="join-success">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#20364D] mb-2">You've Joined the Deal!</h2>
          <p className="text-slate-500 mb-4">{deal.product_name}</p>

          {/* Live progress */}
          <div className="bg-white rounded-2xl border p-5 text-left space-y-3 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Amount Paid</span>
              <span className="font-bold">{fmt(deal.discounted_price)}</span>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Progress</span>
                <span className="font-bold">{deal.current_committed}/{deal.display_target} ({progress}%)</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-green-500" : "bg-[#D4A843]"}`} style={{ width: `${Math.min(progress, 100)}%` }} />
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Spots Remaining</span>
              <span className="font-bold">{spotsLeft}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Time Left</span>
              <span className="font-bold">{daysLeft}d {hoursLeft}h</span>
            </div>
          </div>

          {/* Invite friends message */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4" data-testid="invite-friends-cta">
            <div className="flex items-center gap-2 mb-2">
              <Share2 className="w-4 h-4 text-amber-700" />
              <span className="text-sm font-bold text-amber-800">Invite friends to unlock faster</span>
            </div>
            <p className="text-xs text-amber-700 mb-3">Share this deal — the more people join, the sooner everyone gets their order.</p>
            <ShareButtons dealUrl={dealUrl} productName={deal.product_name} />
          </div>

          {/* Trust line */}
          <div className="flex items-center gap-2 justify-center text-xs text-slate-500 mb-4">
            <Shield className="w-3.5 h-3.5 text-green-500" />
            <span>Full refund if the deal doesn't reach its minimum</span>
          </div>

          <Link to="/group-deals" className="text-sm text-[#20364D] font-semibold hover:underline" data-testid="browse-more-deals">
            Browse More Deals
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 lg:pb-8" data-testid="deal-detail-page">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <Link to="/group-deals" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-6" data-testid="back-to-deals">
          <ArrowLeft className="w-4 h-4" /> All Deals
        </Link>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left — Image + Description */}
          <div className="lg:col-span-3">
            {deal.product_image ? <img src={deal.product_image} alt="" className="w-full rounded-2xl object-cover max-h-96" /> :
              <div className="w-full h-72 rounded-2xl bg-gradient-to-br from-[#20364D] to-[#1a365d] flex items-center justify-center"><ShoppingCart className="w-16 h-16 text-white/20" /></div>}
            {deal.description && <div className="mt-4 bg-white rounded-2xl border p-5"><h3 className="font-bold text-[#20364D] mb-2">About This Deal</h3><p className="text-sm text-slate-600">{deal.description}</p></div>}

            {/* Share section on desktop */}
            <div className="mt-4 bg-white rounded-2xl border p-5 hidden lg:block">
              <h3 className="font-bold text-[#20364D] mb-2 flex items-center gap-2"><Share2 className="w-4 h-4" /> Share This Deal</h3>
              <p className="text-xs text-slate-500 mb-3">Help this deal reach its target — share with colleagues and friends.</p>
              <ShareButtons dealUrl={dealUrl} productName={deal.product_name} />
            </div>
          </div>

          {/* Right — Details + CTA */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border p-5 space-y-4">
              <h1 className="text-xl font-bold text-[#20364D]">{deal.product_name}</h1>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-extrabold text-[#D4A843]">{fmt(deal.discounted_price)}</span>
                {deal.original_price > deal.discounted_price && <span className="text-base text-slate-400 line-through">{fmt(deal.original_price)}</span>}
              </div>
              {deal.discount_pct > 0 && <div className="inline-block text-sm font-bold text-green-700 bg-green-50 px-3 py-1 rounded-lg">Save {deal.discount_pct}%</div>}

              {/* Progress */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold text-[#20364D]">{deal.current_committed} joined</span>
                  <span className="text-slate-500">{spotsLeft} spots left</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-green-500" : "bg-[#D4A843]"}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
              </div>

              {/* Timer */}
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="w-4 h-4" />
                <span>{daysLeft}d {hoursLeft}h remaining</span>
              </div>

              {/* Trust signals */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-slate-500"><Shield className="w-3 h-3 text-green-500" /> Activates once minimum is reached</div>
                <div className="flex items-center gap-2 text-xs text-slate-500"><Shield className="w-3 h-3 text-green-500" /> Full refund if campaign fails</div>
                <div className="flex items-center gap-2 text-xs text-slate-500"><Check className="w-3 h-3 text-green-500" /> Secure payment</div>
                <div className="flex items-center gap-2 text-xs text-slate-500"><Users className="w-3 h-3 text-green-500" /> {deal.current_committed} people already joined</div>
              </div>

              {/* Desktop CTA */}
              {deal.status === "active" ? (
                <Button onClick={() => setShowJoin(true)} className="w-full bg-[#D4A843] hover:bg-[#c49933] text-[#20364D] font-bold py-3 text-base hidden lg:flex" data-testid="join-deal-btn-desktop">
                  Join Deal — {fmt(deal.discounted_price)}
                </Button>
              ) : (
                <div className="p-3 bg-green-50 rounded-xl text-center text-sm font-semibold text-green-700">Target reached — orders being processed</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── MOBILE STICKY CTA ─── */}
      {deal.status === "active" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-xl p-3 z-50 lg:hidden" data-testid="sticky-join-cta">
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500 truncate">{deal.product_name}</div>
              <div className="text-base font-extrabold text-[#D4A843]">{fmt(deal.discounted_price)}</div>
            </div>
            <Button onClick={() => setShowJoin(true)} className="bg-[#D4A843] hover:bg-[#c49933] text-[#20364D] font-bold px-6 py-3 flex-shrink-0" data-testid="join-deal-btn-mobile">
              Join Deal
            </Button>
          </div>
        </div>
      )}

      {/* ─── JOIN MODAL (bottom-sheet on mobile) ─── */}
      {showJoin && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => setShowJoin(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="join-modal">
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />
            <h3 className="text-lg font-bold text-[#20364D] mb-4">Join This Deal</h3>
            <form onSubmit={handleJoin} className="space-y-3">
              <div><Label>Name</Label><Input value={joinForm.customer_name} onChange={(e) => setJoinForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="Your name" data-testid="join-input-name" /></div>
              <div><Label>Phone</Label><Input value={joinForm.customer_phone} onChange={(e) => setJoinForm(p => ({ ...p, customer_phone: e.target.value }))} placeholder="+255..." data-testid="join-input-phone" /></div>
              <div><Label>Payment</Label>
                <select className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white" value={joinForm.payment_method}
                  onChange={(e) => setJoinForm(p => ({ ...p, payment_method: e.target.value }))} data-testid="join-select-payment">
                  <option value="cash">Cash</option><option value="mobile_money">Mobile Money</option><option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-sm font-semibold text-center">Total: {fmt(deal.discounted_price)}</div>
              <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
                <Shield className="w-3 h-3 text-green-500 flex-shrink-0" />
                <span>Full refund if the deal doesn't reach its minimum</span>
              </div>
              <Button type="submit" disabled={joining} className="w-full bg-[#D4A843] hover:bg-[#c49933] text-[#20364D] font-bold py-3" data-testid="confirm-join-btn">
                {joining ? "Processing..." : "Confirm & Pay"}
              </Button>
              <button type="button" onClick={() => setShowJoin(false)} className="w-full text-center text-sm text-slate-500 py-2">Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
