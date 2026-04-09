import React from "react";
import { Link } from "react-router-dom";

export default function PremiumHero({ countryCode, region, availability }) {
  const status = availability?.status || "not_available";

  const headline =
    status === "live"
      ? "Order business products and services from one trusted platform."
      : "Business ordering and service delivery built for Africa.";

  const subtext =
    status === "live"
      ? `Now serving ${availability?.country_name || countryCode}${region ? ` • ${region}` : ""}. Discover products, services, and business support in one place.`
      : "We help businesses access products, services, and local delivery support through one powerful platform.";

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#20364D] text-white" data-testid="premium-hero">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 grid lg:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm">
            {availability?.country_name || "Africa-ready marketplace"} {region ? `• ${region}` : ""}
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight max-w-3xl">
            {headline}
          </h1>

          <p className="text-lg md:text-xl text-slate-200 max-w-2xl">
            {subtext}
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/marketplace"
              className="rounded-2xl bg-[#D4A843] text-slate-900 px-6 py-4 font-bold text-center hover:opacity-95 transition"
              data-testid="hero-marketplace-btn"
            >
              Explore Marketplace
            </Link>
            <Link
              to="/services"
              className="rounded-2xl border border-white/30 bg-white/5 px-6 py-4 font-semibold text-center hover:bg-white/10 transition"
              data-testid="hero-services-btn"
            >
              Explore Services
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <HeroStat label="Products & Services" value="All in one" />
            <HeroStat label="Ordering" value="Country-aware" />
            <HeroStat label="Support" value="Business-focused" />
            <HeroStat label="Growth Model" value="Africa-ready" />
          </div>
        </div>

        <div className="grid gap-4">
          <HeroCard
            title="Promotional Products"
            description="Branded products for campaigns, events, and corporate identity."
          />
          <HeroCard
            title="Office Supplies & Equipment"
            description="Stationery, equipment, consumables, and business essentials."
          />
          <HeroCard
            title="Business Services"
            description="Printing, design, maintenance, and delivery support."
          />
        </div>
      </div>
    </section>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
      <div className="text-sm text-slate-300">{label}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </div>
  );
}

function HeroCard({ title, description }) {
  return (
    <div className="rounded-3xl bg-white/10 border border-white/10 p-6 backdrop-blur-sm hover:bg-white/15 transition">
      <div className="text-xl font-bold">{title}</div>
      <div className="text-slate-200 mt-2">{description}</div>
    </div>
  );
}
