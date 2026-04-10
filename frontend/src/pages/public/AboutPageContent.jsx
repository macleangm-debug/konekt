import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Globe, Users, Shield, Award, ArrowRight, CheckCircle2,
  Building2, Truck, Headphones, TrendingUp, Layers, Zap,
} from "lucide-react";
import { useBranding } from "../../contexts/BrandingContext";

const VALUES = [
  { icon: Shield, title: "Quality Controlled", desc: "Every partner and product goes through strict vetting before reaching your business." },
  { icon: Globe, title: "Country-Aware", desc: "Localized availability, pricing, and delivery networks for each market we operate in." },
  { icon: Users, title: "Business-First", desc: "Purpose-built for procurement teams, not consumers. Every feature serves a business need." },
  { icon: TrendingUp, title: "Scalable Model", desc: "From a single order to enterprise procurement — the platform grows with your operations." },
];

const OFFERINGS = [
  {
    icon: Layers,
    title: "Products & Supplies",
    items: [
      "Corporate apparel and uniforms",
      "Promotional items and branded merchandise",
      "Office stationery and supplies",
      "Signage, banners, and display materials",
    ],
  },
  {
    icon: Building2,
    title: "Business Services",
    items: [
      "Printing and production",
      "Design and branding assistance",
      "Equipment maintenance and installation",
      "Event logistics and coordination",
    ],
  },
  {
    icon: Truck,
    title: "Delivery & Fulfillment",
    items: [
      "Tracked delivery across supported regions",
      "Multi-drop coordination for large orders",
      "Real-time order status visibility",
      "Dedicated sales contact per account",
    ],
  },
  {
    icon: Headphones,
    title: "Support & Account Management",
    items: [
      "Assigned sales representative",
      "Quote-to-order lifecycle tracking",
      "Payment verification and invoicing",
      "AI-assisted product guidance",
    ],
  },
];

const STATS = [
  { value: "500+", label: "Products Available" },
  { value: "50+", label: "Verified Partners" },
  { value: "24hr", label: "Quote Response" },
  { value: "99%", label: "Order Accuracy" },
];

export default function AboutPageContent() {
  const { brand_name } = useBranding();
  const navigate = useNavigate();

  return (
      <div data-testid="about-page">
        {/* Hero */}
        <section className="relative bg-[#20364D] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(212,168,67,0.08)_0%,_transparent_60%)]" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 relative">
            <p className="text-[#D4A843] text-sm font-semibold tracking-widest uppercase mb-4">
              About {brand_name}
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight max-w-3xl leading-[1.1]">
              Built for modern African business operations
            </h1>
            <p className="mt-6 text-lg text-white/70 max-w-2xl leading-relaxed">
              {brand_name} is a business operating system that helps companies source products,
              request services, and manage procurement through one trusted platform. We combine
              ordering, delivery, and service coordination to reduce friction and improve visibility.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={() => navigate("/marketplace")}
                className="rounded-xl bg-white text-[#20364D] px-6 py-3 font-semibold hover:bg-slate-100 transition-colors flex items-center gap-2"
                data-testid="about-browse-btn"
              >
                Browse Marketplace <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate("/request-quote")}
                className="rounded-xl border border-white/30 text-white px-6 py-3 font-semibold hover:bg-white/10 transition-colors"
                data-testid="about-quote-btn"
              >
                Request a Quote
              </button>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-b border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {STATS.map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-3xl font-extrabold text-[#20364D]">{s.value}</p>
                  <p className="text-sm text-slate-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#20364D] mb-2">What sets us apart</h2>
          <p className="text-slate-500 mb-10 max-w-xl">Core principles that guide how we build and operate.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#20364D]/5 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-[#20364D]" />
                  </div>
                  <h3 className="text-base font-bold text-[#20364D]">{v.title}</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Offerings */}
        <section className="bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#20364D] mb-2">What we offer</h2>
            <p className="text-slate-500 mb-10 max-w-xl">End-to-end support for business procurement and service delivery.</p>
            <div className="grid md:grid-cols-2 gap-6">
              {OFFERINGS.map((o) => {
                const Icon = o.icon;
                return (
                  <div key={o.title} className="rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[#D4A843]/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#D4A843]" />
                      </div>
                      <h3 className="text-lg font-bold text-[#20364D]">{o.title}</h3>
                    </div>
                    <ul className="space-y-2">
                      {o.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#20364D] mb-2">How it works</h2>
          <p className="text-slate-500 mb-10 max-w-xl">From request to delivery — a streamlined process.</p>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: 1, title: "Browse or Request", desc: "Explore the marketplace or submit a custom quote request for any product or service." },
              { step: 2, title: "Quote & Payment", desc: "Receive a quote from our sales team. Pay via bank transfer and upload your proof." },
              { step: 3, title: "Processing", desc: "We verify payment, assign vendors, and coordinate production or service delivery." },
              { step: 4, title: "Delivery", desc: "Track your order through every stage until it's delivered to your location." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-[#20364D] text-white flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-bold text-[#20364D] mb-1">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#20364D]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Ready to simplify your procurement?</h2>
            <p className="mt-3 text-white/60 max-w-lg mx-auto">
              Join businesses across Africa that trust {brand_name} for their products, services, and delivery coordination.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button
                onClick={() => navigate("/register")}
                className="rounded-xl bg-white text-[#20364D] px-6 py-3 font-semibold hover:bg-slate-100 transition-colors"
                data-testid="about-register-btn"
              >
                Create Business Account
              </button>
              <Link
                to="/help"
                className="rounded-xl border border-white/30 text-white px-6 py-3 font-semibold hover:bg-white/10 transition-colors"
              >
                Visit Help Center
              </Link>
            </div>
          </div>
        </section>
      </div>
  );
}
