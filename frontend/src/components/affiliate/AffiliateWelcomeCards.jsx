import React, { useState, useEffect } from "react";
import { Sparkles, Link2, ShoppingBag, Wallet, X } from "lucide-react";

const STORAGE_KEY = "konekt_affiliate_welcome_dismissed_v1";

const STEPS = [
  {
    icon: Link2,
    title: "1. Share your link",
    body: "Drop your unique referral link or promo code anywhere — WhatsApp, Instagram, Email, your site.",
  },
  {
    icon: ShoppingBag,
    title: "2. Customers buy",
    body: "Every product page already shows what your followers earn off when they use your code.",
  },
  {
    icon: Wallet,
    title: "3. You earn — every order",
    body: "Each closed order credits your account. Pending → Paid happens when the customer's order is delivered.",
  },
  {
    icon: Sparkles,
    title: "4. Get paid out",
    body: "Cash out from the dashboard when you hit the minimum payout. M-Pesa, bank, or wallet — your choice.",
  },
];

export default function AffiliateWelcomeCards({ affiliateName = "", promoCode = "" }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(localStorage.getItem(STORAGE_KEY) !== "1");
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <section
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1A56F0] via-[#2563eb] to-[#3b82f6] text-white p-6 sm:p-8 shadow-lg"
      data-testid="affiliate-welcome-cards"
    >
      <button
        onClick={dismiss}
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition"
        aria-label="Dismiss welcome"
        data-testid="welcome-dismiss-btn"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" /> Welcome aboard
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold leading-tight">
          {affiliateName ? `Welcome, ${affiliateName.split(" ")[0]} 👋` : "Welcome to the Konekt Affiliate Program 👋"}
        </h2>
        <p className="text-blue-100 text-sm sm:text-base mt-2 leading-relaxed">
          You're set up. Here's how to make your first earning in 4 steps
          {promoCode ? <> — your promo code is <span className="font-mono font-bold text-white bg-white/15 px-1.5 py-0.5 rounded">{promoCode}</span>.</> : "."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-6">
        {STEPS.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.title}
              className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 p-4"
              data-testid={`welcome-card-${s.title.split(".")[0]}`}
            >
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <p className="font-semibold text-sm">{s.title}</p>
              <p className="text-blue-100 text-xs mt-1.5 leading-relaxed">{s.body}</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={dismiss}
          className="text-blue-100 text-xs font-semibold hover:text-white transition"
          data-testid="welcome-got-it-btn"
        >
          Got it — don't show this again
        </button>
      </div>
    </section>
  );
}
