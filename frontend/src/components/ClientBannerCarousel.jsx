import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const banners = [
  {
    id: 1,
    title: "New Season Collection",
    description: "Explore our latest branded merchandise and promotional items",
    bgColor: "bg-gradient-to-r from-[#2D3E50] to-[#3d5269]",
    ctaText: "Shop Now",
    ctaHref: "/products",
  },
  {
    id: 2,
    title: "Creative Services",
    description: "Professional design services for your business needs",
    bgColor: "bg-gradient-to-r from-[#D4A843] to-[#c49a3d]",
    ctaText: "Get Started",
    ctaHref: "/creative-services",
  },
  {
    id: 3,
    title: "Refer & Earn",
    description: "Invite clients and earn points on every successful referral",
    bgColor: "bg-gradient-to-r from-emerald-600 to-emerald-500",
    ctaText: "Learn More",
    ctaHref: "/dashboard/referrals",
  },
];

export default function ClientBannerCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const prev = () => setCurrent((current - 1 + banners.length) % banners.length);
  const next = () => setCurrent((current + 1) % banners.length);

  const banner = banners[current];

  return (
    <div className={`relative rounded-3xl ${banner.bgColor} p-8 text-white overflow-hidden`}>
      <div className="relative z-10 max-w-2xl">
        <h2 className="text-2xl md:text-3xl font-bold">{banner.title}</h2>
        <p className="mt-2 text-white/80">{banner.description}</p>
        <a
          href={banner.ctaHref}
          className="inline-block mt-4 px-6 py-2 rounded-xl bg-white text-[#2D3E50] font-semibold hover:bg-white/90 transition"
        >
          {banner.ctaText}
        </a>
      </div>

      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
        <button
          onClick={prev}
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={next}
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {banners.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`w-2 h-2 rounded-full transition ${
              idx === current ? "bg-white" : "bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
