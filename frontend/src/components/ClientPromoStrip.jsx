import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Palette, ShoppingBag, X } from "lucide-react";

const promoItems = [
  {
    id: 1,
    icon: Gift,
    label: "Refer a friend and earn points on every order they make",
    href: "/account/referrals",
    cta: "Share Now",
    color: "text-[#D4A843]",
    bg: "bg-[#D4A843]/10",
  },
  {
    id: 2,
    icon: Palette,
    label: "Need a new logo or company profile? Start a design project",
    href: "/creative-services",
    cta: "Explore Services",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    id: 3,
    icon: ShoppingBag,
    label: "Order branded merchandise for your team with custom printing",
    href: "/products?branch=Promotional+Materials",
    cta: "Browse Products",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
];

export default function ClientPromoStrip() {
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % promoItems.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [dismissed]);

  if (dismissed) return null;

  const active = promoItems[index];
  const Icon = active.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between gap-4 shadow-sm"
      data-testid="client-promo-strip"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-9 h-9 rounded-lg ${active.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${active.color}`} />
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={active.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="text-sm text-slate-700 truncate"
          >
            {active.label}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          to={active.href}
          className="text-sm font-semibold text-[#2D3E50] hover:underline whitespace-nowrap"
        >
          {active.cta} →
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress dots */}
      <div className="hidden sm:flex items-center gap-1.5 ml-2">
        {promoItems.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              i === index ? "bg-[#2D3E50] w-3" : "bg-slate-300"
            }`}
            aria-label={`Go to promo ${i + 1}`}
          />
        ))}
      </div>
    </motion.div>
  );
}
