import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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


// ─── PAYMENT PROOF FORM (reuses bank payment pattern) ───
function PaymentProofStep({ commitmentRef, amount, productName, onComplete }) {
  const [form, setForm] = useState({ payer_name: "", amount_paid: String(amount || ""), bank_reference: "", payment_method: "bank_transfer", payment_date: new Date().toISOString().split("T")[0] });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.payer_name) { toast.error("Payer name required"); return; }
    if (!form.amount_paid) { toast.error("Amount required"); return; }
    setSubmitting(true);
    try {
      await api.post("/api/public/group-deals/submit-payment", { commitment_ref: commitmentRef, ...form, amount_paid: parseFloat(form.amount_paid) });
      onComplete();
    } catch (err) { toast.error(err.response?.data?.detail || "Payment submission failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4" data-testid="payment-proof-step">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="text-sm font-bold text-blue-800">Complete Your Payment</div>
        <p className="text-xs text-blue-700 mt-1">Transfer {fmt(amount)} for "{productName}" and provide your payment details below.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div><Label>Payer Name *</Label><Input value={form.payer_name} onChange={(e) => setForm(p => ({ ...p, payer_name: e.target.value }))} placeholder="Name on payment" required data-testid="payment-payer-name" /></div>
        <div><Label>Amount Paid *</Label><Input type="number" value={form.amount_paid} onChange={(e) => setForm(p => ({ ...p, amount_paid: e.target.value }))} required data-testid="payment-amount" /></div>
        <div><Label>Bank Reference / Transaction ID</Label><Input value={form.bank_reference} onChange={(e) => setForm(p => ({ ...p, bank_reference: e.target.value }))} placeholder="e.g. TXN-12345" data-testid="payment-reference" /></div>
        <div><Label>Payment Method</Label>
          <select className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white" value={form.payment_method} onChange={(e) => setForm(p => ({ ...p, payment_method: e.target.value }))} data-testid="payment-method-select">
            <option value="bank_transfer">Bank Transfer</option><option value="mobile_money">Mobile Money</option><option value="cash">Cash</option>
          </select>
        </div>
        <div><Label>Payment Date</Label><Input type="date" value={form.payment_date} onChange={(e) => setForm(p => ({ ...p, payment_date: e.target.value }))} data-testid="payment-date" /></div>
        <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
          <Shield className="w-3 h-3 text-green-500 flex-shrink-0" />
          <span>Your payment will be verified before your spot is confirmed.</span>
        </div>
        <Button type="submit" disabled={submitting} className="w-full bg-[#D4A843] hover:bg-[#c49933] text-[#20364D] font-bold py-3" data-testid="submit-payment-btn">
          {submitting ? "Submitting..." : "Submit Payment Proof"}
        </Button>
      </form>
    </div>
  );
}


// ─── DEAL DETAIL PAGE ───

export default function GroupDealDetailPage() {
  const { id } = useParams();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [joinForm, setJoinForm] = useState({ customer_name: "", customer_phone: "", quantity: 1 });
  const [joining, setJoining] = useState(false);
  // Flow states: 'browse' → 'payment' → 'submitted'
  const [flowState, setFlowState] = useState("browse");
  const [commitmentRef, setCommitmentRef] = useState("");
  const [commitmentAmount, setCommitmentAmount] = useState(0);

  useEffect(() => {
    api.get(`/api/public/group-deals/${id}`)
      .then((r) => setDeal(r.data))
      .catch(() => toast.error("Deal not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinForm.customer_name && !joinForm.customer_phone) { toast.error("Name or phone required"); return; }
    if (joining) return;
    setJoining(true);
    try {
      const res = await api.post(`/api/admin/group-deals/campaigns/${id}/join`, { ...joinForm, quantity: Math.max(1, joinForm.quantity) });
      const data = res.data;
      setCommitmentRef(data.commitment_ref);
      setCommitmentAmount(data.amount);
      setShowJoin(false);
      setFlowState("payment");
      toast.success("Commitment created — now submit payment");
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to join"); }
    finally { setJoining(false); }
  };

  const handlePaymentComplete = () => {
    setFlowState("submitted");
    // Refresh deal data
    api.get(`/api/public/group-deals/${id}`).then((r) => setDeal(r.data)).catch(() => {});
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>;
  if (!deal) return <div className="min-h-screen flex items-center justify-center text-slate-500">Deal not found</div>;

  const progress = deal.display_target > 0 ? Math.round((deal.current_committed / deal.display_target) * 100) : 0;
  const daysLeft = deal.deadline ? Math.max(0, Math.ceil((new Date(deal.deadline) - new Date()) / 86400000)) : 0;
  const hoursLeft = deal.deadline ? Math.max(0, Math.ceil((new Date(deal.deadline) - new Date()) / 3600000) % 24) : 0;
  const spotsLeft = Math.max(0, deal.display_target - deal.current_committed);
  const dealUrl = `${window.location.origin}/group-deals/${id}`;

  // ─── PAYMENT SUBMITTED STATE ───
  if (flowState === "submitted") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" data-testid="payment-submitted-state">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#20364D] mb-2">Payment Submitted</h2>
          <p className="text-slate-500 mb-1">{deal.product_name}</p>
          <p className="text-sm text-slate-400 mb-4">We are verifying your payment. You will be notified once approved.</p>

          <div className="bg-white rounded-2xl border p-5 text-left space-y-3 mb-4">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Commitment Ref</span><span className="font-bold font-mono text-xs">{commitmentRef}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Amount</span><span className="font-bold">{fmt(commitmentAmount)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Status</span><span className="font-bold text-blue-600">Payment Under Review</span></div>
          </div>

          <div className="bg-slate-50 rounded-2xl border p-4 mb-4 text-left text-xs text-slate-500">
            <p>Your order will be created once:</p>
            <ol className="list-decimal ml-4 mt-1 space-y-0.5">
              <li>Your payment is verified</li>
              <li>The deal reaches its minimum target</li>
            </ol>
          </div>

          {/* Share CTA */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4" data-testid="invite-friends-cta">
            <div className="flex items-center gap-2 mb-2">
              <Share2 className="w-4 h-4 text-amber-700" />
              <span className="text-sm font-bold text-amber-800">Invite friends to unlock faster</span>
            </div>
            <ShareButtons dealUrl={dealUrl} productName={deal.product_name} />
          </div>

          <div className="flex items-center gap-2 justify-center text-xs text-slate-500 mb-4">
            <Shield className="w-3.5 h-3.5 text-green-500" />
            <span>Full refund if the deal doesn't reach its minimum</span>
          </div>

          <div className="flex gap-3 justify-center">
            <Link to="/track-order" className="text-sm text-[#20364D] font-semibold hover:underline" data-testid="track-status-link">Track Status</Link>
            <span className="text-slate-300">|</span>
            <Link to="/group-deals" className="text-sm text-[#20364D] font-semibold hover:underline" data-testid="browse-more-deals">Browse More Deals</Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── PAYMENT PROOF STEP ───
  if (flowState === "payment") {
    return (
      <div className="min-h-screen bg-slate-50" data-testid="deal-payment-step">
        <div className="max-w-lg mx-auto p-4 md:p-8">
          <button onClick={() => setFlowState("browse")} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Deal
          </button>
          <div className="bg-white rounded-2xl border p-6">
            <h2 className="text-lg font-bold text-[#20364D] mb-1">{deal.product_name}</h2>
            <p className="text-sm text-slate-500 mb-4">Commitment Ref: <span className="font-mono">{commitmentRef}</span></p>
            <PaymentProofStep
              commitmentRef={commitmentRef}
              amount={commitmentAmount}
              productName={deal.product_name}
              onComplete={handlePaymentComplete}
            />
          </div>
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
                <div className="flex items-center gap-2 text-xs text-slate-500"><Users className="w-3 h-3 text-green-500" /> {deal.buyer_count || 0} buyers, {deal.current_committed} units committed</div>
              </div>

              {deal.status === "active" ? (
                <Button onClick={() => setShowJoin(true)} className="w-full bg-[#D4A843] hover:bg-[#c49933] text-[#20364D] font-bold py-3 text-base hidden lg:flex" data-testid="join-deal-btn-desktop">
                  Join Deal — {fmt(deal.discounted_price)}/unit
                </Button>
              ) : (
                <div className="p-3 bg-green-50 rounded-xl text-center text-sm font-semibold text-green-700">Target reached — orders being processed</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      {deal.status === "active" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-xl p-3 z-50 lg:hidden" data-testid="sticky-join-cta">
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500 truncate">{deal.product_name}</div>
              <div className="text-base font-extrabold text-[#D4A843]">{fmt(deal.discounted_price)}/unit</div>
            </div>
            <Button onClick={() => setShowJoin(true)} className="bg-[#D4A843] hover:bg-[#c49933] text-[#20364D] font-bold px-6 py-3 flex-shrink-0" data-testid="join-deal-btn-mobile">
              Join Deal
            </Button>
          </div>
        </div>
      )}

      {/* Join Modal (Step 1: Name + Phone + Quantity) */}
      {showJoin && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => setShowJoin(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="join-modal">
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />
            <h3 className="text-lg font-bold text-[#20364D] mb-4">Join This Deal</h3>
            <form onSubmit={handleJoin} className="space-y-3">
              <div><Label>Name *</Label><Input value={joinForm.customer_name} onChange={(e) => setJoinForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="Your name" data-testid="join-input-name" /></div>
              <div><Label>Phone *</Label><Input value={joinForm.customer_phone} onChange={(e) => setJoinForm(p => ({ ...p, customer_phone: e.target.value }))} placeholder="+255..." data-testid="join-input-phone" /></div>
              <div><Label>Quantity</Label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setJoinForm(p => ({ ...p, quantity: Math.max(1, (p.quantity || 1) - 1) }))}
                    className="w-10 h-10 rounded-xl border flex items-center justify-center text-lg font-bold text-slate-600 hover:bg-slate-50" data-testid="qty-minus">-</button>
                  <Input type="number" min="1" value={joinForm.quantity || 1}
                    onChange={(e) => setJoinForm(p => ({ ...p, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="text-center w-20" data-testid="join-input-quantity" />
                  <button type="button" onClick={() => setJoinForm(p => ({ ...p, quantity: (p.quantity || 1) + 1 }))}
                    className="w-10 h-10 rounded-xl border flex items-center justify-center text-lg font-bold text-slate-600 hover:bg-slate-50" data-testid="qty-plus">+</button>
                  <span className="text-sm text-slate-500">units</span>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-sm font-semibold text-center">
                Total: {fmt(deal.discounted_price * (joinForm.quantity || 1))}
                {(joinForm.quantity || 1) > 1 && <span className="text-xs text-slate-500 block">{joinForm.quantity} x {fmt(deal.discounted_price)}</span>}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
                <Shield className="w-3 h-3 text-green-500 flex-shrink-0" />
                <span>You'll submit payment proof in the next step</span>
              </div>
              <Button type="submit" disabled={joining} className="w-full bg-[#D4A843] hover:bg-[#c49933] text-[#20364D] font-bold py-3" data-testid="confirm-join-btn">
                {joining ? "Processing..." : "Continue to Payment"}
              </Button>
              <button type="button" onClick={() => setShowJoin(false)} className="w-full text-center text-sm text-slate-500 py-2">Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
