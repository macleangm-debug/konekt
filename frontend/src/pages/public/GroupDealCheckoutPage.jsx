import React, { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import {
  ShoppingCart, ArrowLeft, Check, Copy, CreditCard,
  Upload, AlertCircle, Clock, Shield, Share2, MessageCircle, Users,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const fmt = (v) => `TZS ${Number(v || 0).toLocaleString("en-US")}`;

function StepBar({ current }) {
  const steps = [
    { label: "Details", num: "1" },
    { label: "Payment & Proof", num: "2" },
    { label: "Confirmation", num: "3" },
  ];
  const stageMap = { details: 0, payment: 1, done: 2 };
  const currentIdx = stageMap[current] || 0;
  return (
    <div className="flex items-center gap-1 mb-8" data-testid="gd-checkout-steps">
      {steps.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <React.Fragment key={step.label}>
            {i > 0 && <div className={`flex-1 h-0.5 mx-1 rounded ${done ? "bg-green-400" : "bg-slate-200"}`} />}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
              ${done ? "bg-green-100 text-green-700" : active ? "bg-[#20364D] text-white" : "bg-slate-100 text-slate-400"}`}>
              {done ? <Check className="w-4 h-4" /> : <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold">{step.num}</span>}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function GroupDealCheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const campaignId = searchParams.get("campaign_id");

  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState("details");
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState("");

  // Commitment result
  const [commitmentRef, setCommitmentRef] = useState("");
  const [commitmentAmount, setCommitmentAmount] = useState(0);

  // Bank details
  const [bankDetails, setBankDetails] = useState(null);

  // Forms
  const [form, setForm] = useState({
    first_name: "", last_name: "", customer_phone: "", customer_email: "", quantity: 1,
  });
  const [proofForm, setProofForm] = useState({
    payer_name: "", amount_paid: "", bank_reference: "",
    payment_method: "bank_transfer", payment_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (!campaignId) return;
    api.get(`/api/public/group-deals/${campaignId}`)
      .then((r) => setDeal(r.data))
      .catch(() => toast.error("Deal not found"))
      .finally(() => setLoading(false));
  }, [campaignId]);

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied!");
    setTimeout(() => setCopiedField(""), 2000);
  };

  // ─── Step 1: Place commitment ───
  const fullName = [form.first_name, form.last_name].filter(Boolean).join(" ");
  const handlePlaceCommitment = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.customer_phone) return toast.error("First name, last name, and phone are required.");
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/api/admin/group-deals/campaigns/${campaignId}/join`, {
        customer_name: fullName,
        first_name: form.first_name,
        last_name: form.last_name,
        customer_phone: form.customer_phone,
        customer_email: form.customer_email,
        quantity: Math.max(1, form.quantity),
      });
      const data = res.data;
      setCommitmentRef(data.commitment_ref);
      setCommitmentAmount(data.amount);
      setProofForm(p => ({ ...p, payer_name: fullName, amount_paid: String(data.amount) }));

      // Fetch bank details
      fetch(`${API_URL}/api/public/payment-info`)
        .then(r => r.json())
        .then(d => setBankDetails(d))
        .catch(() => {});

      setStage("payment");
      toast.success("Commitment created — now submit your payment proof.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to join deal");
    } finally { setSubmitting(false); }
  };

  // ─── Step 2: Submit payment proof ───
  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!proofForm.payer_name) return toast.error("Enter the payer name.");
    if (!proofForm.amount_paid) return toast.error("Enter the amount paid.");
    setSubmitting(true);
    try {
      await api.post("/api/public/group-deals/submit-payment", {
        commitment_ref: commitmentRef,
        payer_name: proofForm.payer_name,
        amount_paid: parseFloat(proofForm.amount_paid),
        bank_reference: proofForm.bank_reference,
        payment_method: proofForm.payment_method,
        payment_date: proofForm.payment_date,
      });
      setStage("done");
      toast.success("Payment proof submitted!");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Submission failed");
    } finally { setSubmitting(false); }
  };

  if (!campaignId) return <div className="min-h-screen flex items-center justify-center text-slate-500">No campaign specified.</div>;
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>;
  if (!deal) return <div className="min-h-screen flex items-center justify-center text-slate-500">Deal not found.</div>;

  const progress = deal.display_target > 0 ? Math.round((deal.current_committed / deal.display_target) * 100) : 0;
  const daysLeft = deal.deadline ? Math.max(0, Math.ceil((new Date(deal.deadline) - new Date()) / 86400000)) : 0;
  const dealUrl = `${window.location.origin}/group-deals/${campaignId}`;
  const bank = bankDetails || {};
  const qty = Math.max(1, form.quantity);
  const lineTotal = (deal.discounted_price || 0) * qty;

  // ─── DEAL SUMMARY SIDEBAR ───
  const DealSummary = ({ compact }) => (
    <div className={`rounded-2xl border bg-white p-5 ${compact ? "" : "sticky top-24"}`} data-testid="gd-checkout-summary">
      <h2 className="text-base font-bold text-[#20364D] mb-3">Deal Summary</h2>
      <div className="flex gap-3 mb-3">
        {deal.product_image ? <img src={deal.product_image} alt="" className="w-14 h-14 rounded-lg object-cover" /> :
          <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-[#20364D] to-[#1a365d] flex items-center justify-center"><ShoppingCart className="w-6 h-6 text-white/30" /></div>}
        <div>
          <div className="text-sm font-semibold text-[#20364D]">{deal.product_name}</div>
          <div className="text-xs text-slate-500">{fmt(deal.discounted_price)}/unit</div>
        </div>
      </div>
      <div className="space-y-1.5 text-sm border-t pt-3">
        <div className="flex justify-between"><span className="text-slate-500">Quantity</span><span className="font-semibold">{qty} units</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Unit Price</span><span>{fmt(deal.discounted_price)}</span></div>
        {deal.original_price > deal.discounted_price && (
          <div className="flex justify-between text-xs"><span className="text-slate-400">Original Price</span><span className="line-through text-slate-400">{fmt(deal.original_price * qty)}</span></div>
        )}
      </div>
      <div className="border-t mt-3 pt-3 flex justify-between text-base font-bold">
        <span className="text-[#20364D]">Total</span>
        <span className="text-[#D4A843]">{fmt(lineTotal)}</span>
      </div>
      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-2 text-xs text-slate-500"><Shield className="w-3 h-3 text-green-500" /> Full refund if deal fails</div>
        <div className="flex items-center gap-2 text-xs text-slate-500"><Clock className="w-3 h-3 text-slate-400" /> {daysLeft}d left</div>
        <div className="flex items-center gap-2 text-xs text-slate-500"><Users className="w-3 h-3 text-slate-400" /> {deal.current_committed}/{deal.display_target} units committed</div>
      </div>
      {commitmentRef && (
        <div className="mt-3 pt-3 border-t text-xs">
          <span className="text-slate-400">Commitment Ref:</span>
          <span className="font-mono font-bold text-[#20364D] ml-1">{commitmentRef}</span>
        </div>
      )}
    </div>
  );

  // ─── STAGE: DONE ───
  if (stage === "done") {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4" data-testid="gd-checkout-done">
        <div className="max-w-2xl mx-auto">
          <StepBar current="done" />
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#20364D]">Payment Submitted</h1>
            <p className="text-slate-500 mt-1">Hi {form.first_name || "there"}, your payment is under review. We will notify you once approved.</p>
          </div>
          <div className="bg-white rounded-2xl border p-6 space-y-3 mb-6">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Product</span><span className="font-semibold">{deal.product_name}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Commitment Ref</span><span className="font-mono font-bold">{commitmentRef}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Amount</span><span className="font-bold text-[#D4A843]">{fmt(commitmentAmount)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Status</span><span className="font-bold text-blue-600">Payment Under Review</span></div>
          </div>
          <div className="bg-slate-50 rounded-2xl border p-4 mb-6 text-sm text-slate-600">
            <p className="font-semibold text-[#20364D] mb-1">What happens next?</p>
            <ol className="list-decimal ml-4 space-y-0.5 text-xs">
              <li>Your payment will be verified by our team</li>
              <li>Once approved, your spot is confirmed in the deal</li>
              <li>Your order is created only when the deal reaches its target</li>
              <li>Full refund if the deal doesn't complete</li>
            </ol>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6" data-testid="invite-friends-cta">
            <div className="flex items-center gap-2 mb-2">
              <Share2 className="w-4 h-4 text-amber-700" />
              <span className="text-sm font-bold text-amber-800">Invite friends to unlock faster</span>
            </div>
            <p className="text-xs text-amber-700 mb-3">The more people join, the sooner the deal activates.</p>
            {(() => {
              const savings = deal.original_price && deal.discounted_price ? Math.max(0, deal.original_price - deal.discounted_price) : 0;
              const target = deal.display_target || deal.vendor_threshold || 0;
              const current = deal.current_committed || 0;
              const qty = commitmentAmount ? Math.round(commitmentAmount / (deal.discounted_price || 1)) : 1;
              let msg = `I've joined the Connect Deal for ${deal.product_name}`;
              if (qty > 1) msg += ` and bought ${qty} units`;
              msg += ".\n";
              if (savings > 0) msg += `Save TZS ${savings.toLocaleString()} on this deal.\n`;
              if (current > 0 && target > 0) msg += `Already ${current}/${target} units committed.\n`;
              msg += `Join before it closes: ${dealUrl}`;
              return (
                <div className="flex items-center gap-2">
                  <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`}
                    target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-semibold" data-testid="whatsapp-share-btn">
                    <MessageCircle className="w-3.5 h-3.5" /> Share on WhatsApp
                  </a>
                  <button onClick={() => { navigator.clipboard.writeText(msg); handleCopy(msg, "share"); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold" data-testid="copy-share-msg">
                    <Copy className="w-3.5 h-3.5" /> {copiedField === "share" ? "Copied!" : "Copy Message"}
                  </button>
                </div>
              );
            })()}
          </div>
          <div className="flex gap-4 justify-center text-sm">
            <Link to="/track-order" className="font-semibold text-[#20364D] hover:underline" data-testid="track-status-link">Track Status</Link>
            <span className="text-slate-300">|</span>
            <Link to="/group-deals" className="font-semibold text-[#20364D] hover:underline">Browse More Deals</Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── STAGE: PAYMENT ───
  if (stage === "payment") {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4" data-testid="gd-checkout-payment">
        <div className="max-w-5xl mx-auto">
          <StepBar current="payment" />
          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-6">

              {/* Commitment confirmed banner */}
              <div className="rounded-2xl bg-green-50 border border-green-200 p-4 flex items-start gap-3">
                <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-bold text-green-900">Spot Reserved</h2>
                  <p className="text-green-800 text-sm">
                    Ref <span className="font-bold font-mono">{commitmentRef}</span> — {fmt(commitmentAmount)}
                  </p>
                  <p className="text-green-700 text-xs mt-1">Complete your payment and submit proof below to confirm your participation.</p>
                </div>
              </div>

              {/* ─── BANK DETAILS BLOCK (IDENTICAL TO CHECKOUT) ─── */}
              <div className="rounded-2xl border bg-white overflow-hidden" data-testid="bank-details">
                <div className="bg-[#0E1A2B] px-5 py-4">
                  <h2 className="text-white font-bold flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#D4A843]" /> Bank Transfer Details
                  </h2>
                  <p className="text-slate-400 text-xs mt-0.5">Transfer the exact amount to the account below</p>
                </div>
                <div className="p-5 space-y-3">
                  {/* Payment reference */}
                  <div className="rounded-xl bg-amber-50 border-2 border-amber-300 p-4 text-center" data-testid="payment-reference-block">
                    <p className="text-xs font-medium text-amber-700 uppercase tracking-wider mb-1">Payment Reference</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xl font-bold font-mono text-[#20364D]" data-testid="payment-reference">{commitmentRef}</span>
                      <button onClick={() => handleCopy(commitmentRef, "reference")} className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 transition" data-testid="copy-reference-btn">
                        {copiedField === "reference" ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-amber-700" />}
                      </button>
                    </div>
                    <p className="text-xs text-amber-600 mt-1">Use this as your bank transfer reference</p>
                  </div>

                  {/* Bank details grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { label: "Bank Name", value: bank.bank_name, key: "bank" },
                      { label: "Account Name", value: bank.account_name, key: "acct_name" },
                      { label: "Account Number", value: bank.account_number, key: "acct_num" },
                      { label: "Branch", value: bank.branch_name || bank.branch, key: "branch" },
                      { label: "SWIFT Code", value: bank.swift_code || bank.swift, key: "swift" },
                      { label: "Currency", value: bank.currency || "TZS", key: "currency" },
                    ].filter(r => r.value).map(({ label, value, key }) => (
                      <div key={key} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 group">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-slate-500 block">{label}</span>
                          <p className="font-semibold text-[#20364D] text-sm truncate">{value}</p>
                        </div>
                        <button onClick={() => handleCopy(value, key)} className="p-1 text-slate-300 hover:text-[#20364D] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" data-testid={`copy-${key}`}>
                          {copiedField === key ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Amount */}
                  <div className="rounded-lg bg-[#20364D] text-white p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-300">Amount to Transfer</p>
                      <p className="text-xl font-bold" data-testid="transfer-amount">{fmt(commitmentAmount)}</p>
                    </div>
                    <button onClick={() => handleCopy(String(commitmentAmount), "amount")} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition" data-testid="copy-amount">
                      {copiedField === "amount" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Instructions */}
                  <div className="text-sm text-slate-600 space-y-1.5 pt-2">
                    <p className="font-medium text-[#20364D] flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-500" /> Payment Instructions
                    </p>
                    <ol className="list-decimal list-inside text-xs space-y-1 text-slate-500 pl-1">
                      <li>Transfer the exact amount shown above to the bank account</li>
                      <li>Use <strong>{commitmentRef}</strong> as payment reference</li>
                      <li>After payment, fill in the proof form below</li>
                      <li>Our team will verify your payment within 1-2 business hours</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* ─── PAYMENT PROOF FORM (IDENTICAL TO CHECKOUT) ─── */}
              <form onSubmit={handleSubmitProof} className="rounded-2xl border bg-white p-5 space-y-4" data-testid="payment-proof-form">
                <div>
                  <h2 className="text-lg font-bold text-[#20364D] flex items-center gap-2">
                    <Upload className="w-5 h-5" /> Submit Payment Proof
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Provide your payment details below</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label>Payer Name *</Label><Input value={proofForm.payer_name} onChange={(e) => setProofForm(p => ({ ...p, payer_name: e.target.value }))} required data-testid="proof-payer-name" /></div>
                  <div><Label>Amount Paid *</Label><Input type="number" value={proofForm.amount_paid} onChange={(e) => setProofForm(p => ({ ...p, amount_paid: e.target.value }))} required data-testid="proof-amount" /></div>
                  <div><Label>Bank Reference / Transaction ID</Label><Input value={proofForm.bank_reference} onChange={(e) => setProofForm(p => ({ ...p, bank_reference: e.target.value }))} placeholder="e.g. TXN-12345" data-testid="proof-reference" /></div>
                  <div><Label>Payment Method</Label>
                    <select className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white" value={proofForm.payment_method} onChange={(e) => setProofForm(p => ({ ...p, payment_method: e.target.value }))} data-testid="proof-method">
                      <option value="bank_transfer">Bank Transfer</option><option value="mobile_money">Mobile Money</option>
                    </select>
                  </div>
                  <div><Label>Payment Date</Label><Input type="date" value={proofForm.payment_date} onChange={(e) => setProofForm(p => ({ ...p, payment_date: e.target.value }))} data-testid="proof-date" /></div>
                </div>
                <Button type="submit" disabled={submitting} className="w-full bg-[#D4A843] hover:bg-[#c49933] text-[#20364D] font-bold py-3 text-base" data-testid="submit-proof-btn">
                  {submitting ? "Submitting..." : "Submit Payment Proof"}
                </Button>
              </form>
            </div>
            <div className="lg:col-span-2"><DealSummary /></div>
          </div>
        </div>
      </div>
    );
  }

  // ─── STAGE: DETAILS (Step 1) ───
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4" data-testid="gd-checkout-details">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate(`/group-deals/${campaignId}`)} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4" data-testid="back-to-deal">
          <ArrowLeft className="w-4 h-4" /> Back to Deal
        </button>
        <StepBar current="details" />
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <form onSubmit={handlePlaceCommitment} className="rounded-2xl border bg-white p-5 space-y-4" data-testid="gd-details-form">
              <div>
                <h2 className="text-lg font-bold text-[#20364D]">Your Details</h2>
                <p className="text-xs text-slate-500 mt-0.5">Fill in your details to join this group deal</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>Full Name *</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Input value={form.first_name} onChange={(e) => setForm(p => ({ ...p, first_name: e.target.value }))} placeholder="First name" required data-testid="input-first-name" />
                    <Input value={form.last_name} onChange={(e) => setForm(p => ({ ...p, last_name: e.target.value }))} placeholder="Last name" required data-testid="input-last-name" />
                  </div>
                </div>
                <div><Label>Phone Number *</Label><Input value={form.customer_phone} onChange={(e) => setForm(p => ({ ...p, customer_phone: e.target.value }))} placeholder="+255..." required data-testid="input-phone" /></div>
                <div><Label>Email (optional)</Label><Input type="email" value={form.customer_email} onChange={(e) => setForm(p => ({ ...p, customer_email: e.target.value }))} placeholder="you@example.com" data-testid="input-email" /></div>
                <div><Label>Quantity</Label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setForm(p => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}
                      className="w-10 h-10 rounded-xl border flex items-center justify-center text-lg font-bold hover:bg-slate-50" data-testid="qty-minus">-</button>
                    <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm(p => ({ ...p, quantity: Math.max(1, parseInt(e.target.value) || 1) }))} className="text-center w-20" data-testid="input-quantity" />
                    <button type="button" onClick={() => setForm(p => ({ ...p, quantity: p.quantity + 1 }))}
                      className="w-10 h-10 rounded-xl border flex items-center justify-center text-lg font-bold hover:bg-slate-50" data-testid="qty-plus">+</button>
                    <span className="text-sm text-slate-500">units</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
                <Shield className="w-3 h-3 text-green-500 flex-shrink-0" />
                <span>You'll see bank transfer details in the next step. Full refund if deal fails.</span>
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-[#D4A843] hover:bg-[#c49933] text-[#20364D] font-bold py-3 text-base" data-testid="continue-to-payment-btn">
                {submitting ? "Processing..." : "Continue to Payment"}
              </Button>
            </form>
          </div>
          <div className="lg:col-span-2"><DealSummary compact /></div>
        </div>
      </div>
    </div>
  );
}
