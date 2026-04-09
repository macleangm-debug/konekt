import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search, ShoppingBag, ShieldCheck, Truck,
  CheckCircle2, Quote, ArrowRight,
  Package, Printer, Briefcase, PenTool,
} from "lucide-react";
import api from "../lib/api";
import { getStoredCountryCode, getStoredRegion } from "../lib/countryPreference";
import CountrySelectorModal from "../components/public/CountrySelectorModal";

// ═══════════════════════════════════════════════════════
// 1. HERO
// ═══════════════════════════════════════════════════════
function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#0E1A2B] text-white" data-testid="hero-section">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
        backgroundSize: "40px 40px"
      }} />

      <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28 lg:py-32">
        <div className="max-w-3xl space-y-6">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] font-bold leading-[1.15] tracking-tight"
            data-testid="hero-headline"
          >
            Order Business Supplies, Printing & Services
            <span className="text-[#D4A843]"> — Fast, Verified, and Fully Managed</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed" data-testid="hero-subtext">
            Konekt sources, verifies your payment, and ensures
            your order is delivered — all in one seamless process.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              to="/marketplace"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4A843] text-[#17283C] px-7 py-3.5 font-bold hover:bg-[#c49a3d] transition"
              data-testid="hero-browse-btn"
            >
              Browse Products <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/request-quote"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-7 py-3.5 font-semibold hover:bg-white/10 transition"
              data-testid="hero-quote-btn"
            >
              Request a Quote
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}


// ═══════════════════════════════════════════════════════
// 2. HOW IT WORKS
// ═══════════════════════════════════════════════════════
function HowItWorksSection() {
  const steps = [
    {
      num: "1",
      title: "Browse or Request",
      text: "Explore products or request custom quotes for what your business needs.",
      Icon: Search,
    },
    {
      num: "2",
      title: "Place Order & Pay",
      text: "Complete your order and submit payment proof — no guesswork.",
      Icon: ShoppingBag,
    },
    {
      num: "3",
      title: "We Verify & Assign",
      text: "Konekt verifies your payment and ensures the right products reach you on time.",
      Icon: ShieldCheck,
    },
    {
      num: "4",
      title: "Delivery & Tracking",
      text: "Track your order and receive it on time, fully managed by Konekt.",
      Icon: Truck,
    },
  ];

  return (
    <section className="bg-slate-50 py-16 md:py-20" data-testid="how-it-works-section">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#20364D]">How It Works</h2>
          <p className="text-slate-600 mt-3 text-base md:text-lg">
            From browsing to delivery — a structured, transparent process you can rely on.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step) => (
            <div
              key={step.num}
              className="rounded-2xl bg-white border p-6 hover:shadow-lg transition-shadow group"
              data-testid={`hiw-step-${step.num}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="w-9 h-9 rounded-full bg-[#20364D] text-white flex items-center justify-center text-sm font-bold">
                  {step.num}
                </span>
                <step.Icon className="w-5 h-5 text-[#D4A843] group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-lg font-bold text-[#20364D] mb-2">{step.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


// ═══════════════════════════════════════════════════════
// 3. TRUST SIGNALS
// ═══════════════════════════════════════════════════════
function TrustSignalsSection() {
  const signals = [
    {
      title: "Quality Assurance",
      text: "Every product and service on Konekt is sourced and verified to meet business standards before it reaches you.",
    },
    {
      title: "Payment Verification",
      text: "Payments are verified by our admin team before any order is processed — ensuring accountability.",
    },
    {
      title: "Dedicated Support",
      text: "Our sales and operations team manages your order end-to-end, from placement to delivery.",
    },
  ];

  return (
    <section className="py-16 md:py-20" data-testid="trust-signals-section">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#20364D]">Why Businesses Trust Konekt</h2>
          <p className="text-slate-600 mt-3 text-base md:text-lg">
            Trusted by growing businesses. A reliable ordering and delivery experience you can count on.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {signals.map((s) => (
            <div key={s.title} className="rounded-2xl border bg-white p-6" data-testid={`trust-${s.title.toLowerCase().replace(/\s+/g, '-')}`}>
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-[#20364D] mb-2">{s.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


// ═══════════════════════════════════════════════════════
// 4. FEATURED CATEGORIES
// ═══════════════════════════════════════════════════════
function FeaturedCategoriesSection() {
  const categories = [
    {
      title: "Office Equipment",
      description: "Machines, devices, supplies, and accessories for productive workspaces.",
      href: "/marketplace?category=office_equipment",
      Icon: Briefcase,
      accent: "from-blue-500 to-indigo-600",
    },
    {
      title: "Office Stationery",
      description: "Paper, pens, folders, filing, and everyday essentials for the office.",
      href: "/marketplace?category=office_stationery",
      Icon: Package,
      accent: "from-emerald-500 to-teal-600",
    },
    {
      title: "Promotional Materials",
      description: "Branded gifts, apparel, marketing items, and corporate giveaways.",
      href: "/marketplace?category=promotional",
      Icon: Printer,
      accent: "from-amber-500 to-orange-600",
    },
    {
      title: "Business Services",
      description: "Printing, design, maintenance, and professional support services.",
      href: "/services",
      Icon: PenTool,
      accent: "from-purple-500 to-pink-600",
    },
  ];

  return (
    <section className="bg-slate-50 py-16 md:py-20" data-testid="featured-categories-section">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#20364D]">What You Can Order</h2>
          <p className="text-slate-600 mt-3 text-base md:text-lg">
            Products and services organized so you can find what you need fast.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.map((cat) => (
            <Link
              key={cat.title}
              to={cat.href}
              className="group rounded-2xl bg-white border p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              data-testid={`cat-${cat.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.accent} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                <cat.Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-[#20364D] mb-1">{cat.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">{cat.description}</p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#20364D] group-hover:gap-2 transition-all">
                Browse <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}


// ═══════════════════════════════════════════════════════
// 5. TESTIMONIALS
// ═══════════════════════════════════════════════════════
function TestimonialsSection() {
  const testimonials = [
    {
      quote: "Konekt makes it easier to coordinate supplies, services, and delivery without running through multiple channels.",
      name: "Operations Manager",
      company: "Growing SME",
    },
    {
      quote: "The platform has the potential to simplify business sourcing and execution in a very practical way.",
      name: "Procurement Lead",
      company: "Corporate Client",
    },
    {
      quote: "It feels like a system built for how African businesses actually operate — structured but flexible.",
      name: "Business Founder",
      company: "Regional Brand",
    },
  ];

  return (
    <section className="py-16 md:py-20" data-testid="testimonials-section">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#20364D]">What Businesses Say</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <div key={i} className="rounded-2xl border bg-white p-6" data-testid={`testimonial-${i}`}>
              <Quote className="w-7 h-7 text-[#D4A843] mb-3" />
              <p className="text-slate-700 leading-relaxed mb-5">"{t.quote}"</p>
              <div className="pt-4 border-t">
                <p className="font-bold text-[#20364D] text-sm">{t.name}</p>
                <p className="text-slate-500 text-xs">{t.company}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


// ═══════════════════════════════════════════════════════
// 6. PAYMENT TRUST BLOCK
// ═══════════════════════════════════════════════════════
function PaymentTrustBlock() {
  return (
    <section className="py-16 md:py-20" data-testid="payment-trust-section">
      <div className="max-w-7xl mx-auto px-6">
        <div className="rounded-2xl bg-[#0E1A2B] text-white p-8 md:p-12 flex flex-col md:flex-row items-center gap-6 md:gap-10">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-[#D4A843]/20 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-8 h-8 md:w-10 md:h-10 text-[#D4A843]" />
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-xl md:text-2xl font-bold mb-2">Your Payment Is Verified First</h2>
            <p className="text-slate-300 leading-relaxed max-w-2xl">
              Your payment is verified before any order is processed — ensuring transparency
              and accountability at every step. No order moves forward until payment is confirmed.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}


// ═══════════════════════════════════════════════════════
// 7. CTA SECTION
// ═══════════════════════════════════════════════════════
function CtaSection() {
  return (
    <section className="bg-slate-50 py-16 md:py-20" data-testid="cta-section">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#20364D] mb-3">
          Ready to Place Your Order?
        </h2>
        <p className="text-slate-600 text-base md:text-lg max-w-xl mx-auto mb-8">
          Browse our marketplace or request a custom quote — no account required to get started.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 rounded-xl bg-[#D4A843] text-[#17283C] px-7 py-3.5 font-bold hover:bg-[#c49a3d] transition"
            data-testid="cta-browse-btn"
          >
            Browse Products <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/request-quote"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-[#20364D] text-[#20364D] px-7 py-3.5 font-semibold hover:bg-[#20364D] hover:text-white transition"
            data-testid="cta-quote-btn"
          >
            Request a Quote
          </Link>
        </div>
      </div>
    </section>
  );
}


// ═══════════════════════════════════════════════════════
// MAIN PAGE COMPOSITION
// ═══════════════════════════════════════════════════════
export default function HomepageV2Content() {
  const [showCountryModal, setShowCountryModal] = useState(false);
  const countryCode = getStoredCountryCode();

  useEffect(() => {
    if (!countryCode) setShowCountryModal(true);
  }, [countryCode]);

  return (
    <div data-testid="homepage-v2-content">
      {showCountryModal && (
        <CountrySelectorModal
          onDone={() => { setShowCountryModal(false); window.location.reload(); }}
        />
      )}

      <HeroSection />
      <HowItWorksSection />
      <TrustSignalsSection />
      <FeaturedCategoriesSection />
      <TestimonialsSection />
      <PaymentTrustBlock />
      <CtaSection />
    </div>
  );
}
