import React, { useState, useCallback } from "react";
import { LayoutDashboard, Package, Gift, TrendingUp, Users, Shield, BarChart3 } from "lucide-react";

const ROLE_CARDS = {
  customer: [
    { icon: LayoutDashboard, title: "Welcome to Konekt", text: "Manage your orders, payments, and progress in one place." },
    { icon: Package, title: "Track everything", text: "Stay updated on quotes, invoices, and order status." },
    { icon: Gift, title: "Earn as you use", text: "Refer others and use rewards for eligible fees." },
    { icon: TrendingUp, title: "Stay informed", text: "Get notified when action is needed." },
  ],
  vendor: [
    { icon: Package, title: "Welcome to your Vendor Portal", text: "Manage assigned work and track progress." },
    { icon: TrendingUp, title: "Stay on schedule", text: "Update fulfillment stages and delivery timelines." },
    { icon: Shield, title: "Build your performance", text: "Consistency improves visibility and trust." },
  ],
  partner: [
    { icon: Package, title: "Welcome to your Vendor Portal", text: "Manage assigned work and track progress." },
    { icon: TrendingUp, title: "Stay on schedule", text: "Update fulfillment stages and delivery timelines." },
    { icon: Shield, title: "Build your performance", text: "Consistency improves visibility and trust." },
  ],
  affiliate: [
    { icon: Gift, title: "Welcome to Affiliate Tools", text: "Share links and track your earnings." },
    { icon: TrendingUp, title: "Promote with ease", text: "Use ready-to-share tools to grow conversions." },
    { icon: BarChart3, title: "Track your income", text: "See commissions and payouts clearly." },
  ],
  sales: [
    { icon: LayoutDashboard, title: "Welcome to Sales", text: "Manage your pipeline and daily actions." },
    { icon: TrendingUp, title: "Focus on priorities", text: "See what needs follow-up and closing." },
    { icon: Shield, title: "Improve performance", text: "Track your ratings and coaching insights." },
  ],
  sales_manager: [
    { icon: Users, title: "Team Command Center", text: "Monitor team performance and pipeline health." },
    { icon: TrendingUp, title: "Lead with insight", text: "Use ratings, alerts, and trends to guide your team." },
    { icon: Shield, title: "Act early", text: "Spot risks and support underperforming reps." },
  ],
  finance_manager: [
    { icon: BarChart3, title: "Financial Control Center", text: "Track revenue, payments, and margins." },
    { icon: TrendingUp, title: "See what matters", text: "Monitor outstanding invoices and cash flow." },
    { icon: Shield, title: "Make faster decisions", text: "Use reports to stay ahead." },
  ],
  admin: [
    { icon: Shield, title: "Full System Visibility", text: "Access operations, finance, sales, and governance." },
    { icon: LayoutDashboard, title: "Run everything from one place", text: "Use dashboards, reports, and settings." },
    { icon: TrendingUp, title: "Stay ahead", text: "Monitor risks, performance, and growth." },
  ],
};

export default function OnboardingWizard({ role = "customer", onDone, onSkip }) {
  const cards = ROLE_CARDS[role] || ROLE_CARDS.customer;
  const [idx, setIdx] = useState(0);
  const isLast = idx === cards.length - 1;
  const card = cards[idx];
  const Icon = card.icon;

  const next = useCallback(() => {
    if (isLast) {
      onDone?.();
    } else {
      setIdx((i) => i + 1);
    }
  }, [isLast, onDone]);

  const back = useCallback(() => {
    if (idx > 0) setIdx((i) => i - 1);
  }, [idx]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" data-testid="onboarding-overlay">
      <div className="relative w-full max-w-md mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden" data-testid="onboarding-carousel">
        {/* Skip */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-5 text-xs text-slate-400 hover:text-slate-600 font-medium transition z-10"
          data-testid="onboarding-skip-btn"
        >
          Skip
        </button>

        {/* Card */}
        <div className="px-8 pt-10 pb-6">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-8" data-testid="onboarding-progress-dots">
            {cards.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === idx ? "w-6 bg-[#D4A843]" : i < idx ? "w-1.5 bg-[#D4A843]/40" : "w-1.5 bg-slate-200"
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#20364D] to-[#2a4560] flex items-center justify-center shadow-lg">
              <Icon className="w-7 h-7 text-[#D4A843]" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-center text-xl font-bold text-[#0E1A2B]" data-testid="onboarding-title">
            {card.title}
          </h2>

          {/* One sentence */}
          <p className="text-center text-sm text-slate-500 mt-2 leading-relaxed max-w-xs mx-auto" data-testid="onboarding-text">
            {card.text}
          </p>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex items-center justify-between gap-3">
          <button
            onClick={back}
            disabled={idx === 0}
            className="text-sm font-medium text-slate-400 hover:text-slate-600 transition disabled:opacity-0 disabled:pointer-events-none"
            data-testid="onboarding-back-btn"
          >
            Back
          </button>
          <button
            onClick={next}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition ${
              isLast
                ? "bg-[#D4A843] text-[#0E1A2B] hover:bg-[#c49a3d] shadow-md"
                : "bg-[#0E1A2B] text-white hover:bg-[#1a2d42]"
            }`}
            data-testid="onboarding-next-btn"
          >
            {isLast ? "Open Dashboard" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
