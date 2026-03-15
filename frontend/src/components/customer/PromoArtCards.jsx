import React from "react";
import { Link } from "react-router-dom";
import { Palette, Gift, Wrench } from "lucide-react";

const cards = [
  {
    title: "Need a new logo or brochure?",
    text: "Start a creative brief and get premium design support from anywhere.",
    href: "/services/logo-design/request",
    cta: "Start Design Request",
    icon: Palette,
  },
  {
    title: "Refer friends and earn points",
    text: "Grow your rewards every time your referrals complete purchases.",
    href: "/dashboard/referrals",
    cta: "Refer & Earn",
    icon: Gift,
  },
  {
    title: "Book maintenance support",
    text: "Keep your office machines and equipment running smoothly.",
    href: "/services/equipment-repair-request/request",
    cta: "Book Support",
    icon: Wrench,
  },
];

export default function PromoArtCards() {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="promo-art-cards">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.title}
            to={card.href}
            className="rounded-3xl bg-gradient-to-br from-white to-slate-50 border p-6 hover:shadow-sm transition"
            data-testid={`promo-card-${card.cta.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Icon size={22} className="text-[#2D3E50]" />
            </div>

            <h3 className="text-2xl font-bold text-[#2D3E50] mt-5">{card.title}</h3>
            <p className="text-slate-600 mt-2">{card.text}</p>
            <div className="text-[#D4A843] font-semibold mt-5">{card.cta}</div>
          </Link>
        );
      })}
    </div>
  );
}
