import React, { useEffect, useState } from "react";
import { X, ArrowRight, CheckCircle2, Link2, ShoppingBag, Wallet, Sparkles, MessageCircle } from "lucide-react";
import { Button } from "../ui/button";

const STORAGE_KEY = "konekt_affiliate_onboarding_v2_dismissed";

const STEPS = [
  {
    icon: Link2,
    title: "Step 1 · Share",
    headline: "Drop your link or QR anywhere",
    body: "Your unique referral link and the QR code on every Content Studio creative are pre-baked with your promo code. Share them on WhatsApp, Instagram, email, or print. Customers scanning the QR will be tracked back to you.",
    bullets: [
      "Every Content Studio creative carries your QR + promo code",
      "Send the link or post the screenshot — both work",
      "30-day attribution sticks even if the customer browses elsewhere first",
    ],
    cta: { label: "Open Content Studio", path: "/partner/affiliate-content-studio" },
  },
  {
    icon: ShoppingBag,
    title: "Step 2 · Customers buy",
    headline: "Every closed order credits you",
    body: "Customers see exactly what they save when they use your code. Their order is automatically tagged to you — you don't have to chase or remind anyone.",
    bullets: [
      "Pricing is honest: customers see the savings, you see the earning",
      "Cancelled / refunded orders never hit your earnings — only closed orders",
      "All your earnings appear here with full order details",
    ],
    cta: { label: "View live products", path: "/partner/affiliate-promotions" },
  },
  {
    icon: Wallet,
    title: "Step 3 · Get paid",
    headline: "Cash out from your dashboard",
    body: "Once your pending earnings clear, you can request a payout right from the dashboard — M-Pesa, bank transfer, or your wallet. No emails, no chasing.",
    bullets: [
      "Pending → Paid happens when the customer's order is delivered",
      "Minimum payout is configured by Konekt operations",
      "Full history visible in the Earnings tab",
    ],
    cta: { label: "View earnings", path: "/partner/affiliate-earnings" },
  },
];

export function isAffiliateOnboardingDismissed() {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
}

export function resetAffiliateOnboarding() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* private mode */ }
}

/**
 * AffiliateOnboardingModal — first-login walkthrough for new affiliates.
 *
 * Visual: matches the canonical OpsOnboardingModal layout (3-step modal
 * with hero header, body bullets, CTA + Next/Skip footer) but uses the
 * Konekt brand palette — deep navy `#20364D` + gold `#D4A843` — instead
 * of the indigo/amber/emerald variants used in admin Ops onboarding.
 */
export default function AffiliateOnboardingModal({ open, onClose, onCta, promoCode = "", name = "" }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => { if (open) setIdx(0); }, [open]);
  if (!open) return null;

  const total = STEPS.length;
  const step = STEPS[idx];
  const Icon = step.icon;

  const finish = (dismiss = true) => {
    if (dismiss) {
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* private mode */ }
    }
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/55 flex items-center justify-center p-4" data-testid="affiliate-onboarding-modal">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl">
        {/* Hero — Konekt brand: deep navy → gold accent */}
        <div className="bg-gradient-to-br from-[#20364D] via-[#23415F] to-[#1a2d40] p-8 text-white relative">
          <button onClick={() => finish(false)} className="absolute top-4 right-4 text-white/80 hover:text-white p-1" data-testid="affiliate-onboarding-close">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-[#D4A843] text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Affiliate onboarding · Step {idx + 1} of {total}
          </div>
          <div className="flex items-start gap-4 mt-3">
            <div className="w-14 h-14 rounded-2xl bg-[#D4A843]/15 ring-1 ring-[#D4A843]/30 flex items-center justify-center flex-shrink-0">
              <Icon className="w-7 h-7 text-[#D4A843]" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider opacity-75">{step.title}</div>
              <h2 className="text-2xl font-bold mt-0.5 leading-tight">{step.headline}</h2>
            </div>
          </div>
          {idx === 0 && (name || promoCode) && (
            <p className="text-white/75 text-sm mt-3 leading-relaxed">
              {name ? `Welcome, ${name.split(" ")[0]}. ` : ""}
              {promoCode ? <>Your promo code is <span className="font-mono font-bold text-[#D4A843] bg-white/10 px-1.5 py-0.5 rounded">{promoCode}</span> — it's now baked into every QR + caption in your Content Studio.</> : null}
            </p>
          )}
          {/* Progress dots */}
          <div className="flex gap-1.5 mt-5">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all ${i === idx ? "w-8 bg-[#D4A843]" : i < idx ? "w-6 bg-[#D4A843]/60" : "w-6 bg-white/25"}`} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">{step.body}</p>
          <ul className="space-y-2" data-testid="affiliate-onboarding-bullets">
            {step.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          {idx === 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
              <MessageCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span><span className="font-semibold">Pro tip</span> — the green WhatsApp button on every campaign drops the post into a chat with the link + QR + savings already typed out. One tap to share.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between gap-2">
          <button onClick={() => finish(true)} className="text-xs text-slate-500 hover:text-slate-700 font-semibold" data-testid="affiliate-onboarding-skip">
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {idx > 0 && (
              <Button variant="outline" size="sm" onClick={() => setIdx(idx - 1)} data-testid="affiliate-onboarding-back">
                Back
              </Button>
            )}
            {step.cta && (
              <Button variant="outline" size="sm" onClick={() => { onCta?.(step.cta.path); finish(true); }} data-testid="affiliate-onboarding-cta">
                {step.cta.label}
              </Button>
            )}
            {idx < total - 1 ? (
              <Button size="sm" onClick={() => setIdx(idx + 1)} className="bg-[#20364D] hover:bg-[#1a2d40]" data-testid="affiliate-onboarding-next">
                Next <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => finish(true)} className="bg-[#D4A843] hover:bg-[#c19838] text-[#20364D] font-semibold" data-testid="affiliate-onboarding-finish">
                Got it
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
